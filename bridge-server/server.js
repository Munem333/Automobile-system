'use strict';

const net = require('net');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { WebSocketServer } = require('ws');

const execFileAsync = promisify(execFile);

const HTTP_PORT = 3000;
const WS_LEGACY_PORT = 8080;
const WEB_ROOT = path.join(__dirname, '..', 'erp-pos-web');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
};
const ADB_TCP_PORT = 8765;
const ADB_SOCKET_NAME = 'erppos_adb';
const SERVICE_UUID = '12345678-1234-1234-1234-123456789abc';
const CHAR_UUID = '87654321-4321-4321-4321-cba987654321';
const MTU_CHUNK_SIZE = 20;
const DATA_PER_CHUNK = MTU_CHUNK_SIZE - 2;
const SCAN_TIMEOUT_MS = 15000;
const BLE_DEVICE_NAMES = ['ERP-POS-001', 'ERP POS'];

let noble = null;
try {
  noble = require('@abandonware/noble');
} catch {
  noble = null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function buildBleChunks(payloadStr) {
  const bytes = Buffer.from(payloadStr, 'utf8');
  const total = Math.ceil(bytes.length / DATA_PER_CHUNK) || 1;
  const chunks = [];
  for (let seq = 0; seq < total; seq++) {
    const chunk = Buffer.alloc(MTU_CHUNK_SIZE);
    chunk[0] = seq;
    chunk[1] = total;
    bytes.copy(chunk, 2, seq * DATA_PER_CHUNK, Math.min(bytes.length, (seq + 1) * DATA_PER_CHUNK));
    chunks.push(chunk);
  }
  chunks.push(Buffer.from([0xff, 0xff]));
  return chunks;
}

const ADB_CMD_TIMEOUT_MS = 10000;
const ADB_DEVICE_CACHE_MS = 10000;
const ADB_PHONE_READY_CACHE_MS = 45000;
const ADB_WARM_INTERVAL_MS = 8000;

function readSdkDirFromProps() {
  try {
    const propsPath = path.join(__dirname, '..', 'erp-pos-android', 'local.properties');
    if (!fs.existsSync(propsPath)) return null;
    const props = fs.readFileSync(propsPath, 'utf8');
    const match = props.match(/^sdk\.dir=(.+)$/m);
    if (!match) return null;
    return match[1].trim().replace(/\\:/g, ':').replace(/\\\\/g, '\\');
  } catch {
    return null;
  }
}

function resolveAdbPath() {
  const adbName = process.platform === 'win32' ? 'adb.exe' : 'adb';
  const candidates = [];
  const envSdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  const propsSdk = readSdkDirFromProps();
  for (const sdk of [envSdk, propsSdk]) {
    if (sdk) candidates.push(path.join(sdk, 'platform-tools', adbName));
  }
  if (process.env.LOCALAPPDATA) {
    candidates.push(path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', adbName));
  }
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  return adbName;
}

const ADB_BIN = resolveAdbPath();
const adbExec = (args) => execFileAsync(ADB_BIN, args, { timeout: ADB_CMD_TIMEOUT_MS });

async function ensureAdbServer() {
  try {
    await adbExec(['start-server']);
  } catch {
    // daemon may already be running
  }
}

let adbForwardReady = false;
const adbCache = {
  status: 'none',
  checkedAt: 0,
  phoneReady: false,
  phoneReadyAt: 0,
  deviceName: '',
};

async function refreshAdbDeviceName() {
  try {
    const { stdout } = await adbExec(['devices', '-l']);
    const line = stdout.split('\n').find((row) => row.includes('\tdevice'));
    if (line) {
      const modelMatch = line.match(/model:(\S+)/);
      if (modelMatch) {
        adbCache.deviceName = modelMatch[1].replace(/_/g, ' ');
        return adbCache.deviceName;
      }
    }
    const { stdout: model } = await adbExec(['shell', 'getprop', 'ro.product.model']);
    adbCache.deviceName = (model || '').trim() || 'Android Phone';
    return adbCache.deviceName;
  } catch {
    adbCache.deviceName = adbCache.deviceName || 'Android Phone';
    return adbCache.deviceName;
  }
}

function withDeviceInfo(result) {
  return { ...result, deviceName: adbCache.deviceName || 'Android Phone' };
}

async function refreshAdbDeviceStatus(force = false) {
  const now = Date.now();
  if (!force && now - adbCache.checkedAt < ADB_DEVICE_CACHE_MS) {
    return adbCache.status;
  }
  try {
    const { stdout } = await adbExec(['devices']);
    adbCache.checkedAt = now;
    for (const line of stdout.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('List')) continue;
      if (trimmed.includes('\tdevice')) {
        adbCache.status = 'device';
        return 'device';
      }
      if (trimmed.includes('\tunauthorized')) {
        adbCache.status = 'unauthorized';
        adbCache.phoneReady = false;
        return 'unauthorized';
      }
      if (trimmed.includes('\toffline')) {
        adbCache.status = 'offline';
        adbCache.phoneReady = false;
        return 'offline';
      }
    }
    adbCache.status = 'none';
    adbCache.phoneReady = false;
    return 'none';
  } catch {
    adbCache.status = 'none';
    adbCache.phoneReady = false;
    return 'none';
  }
}

async function adbHasDevice() {
  return (await refreshAdbDeviceStatus()) === 'device';
}

async function ensureAdbForward(force = false) {
  if (!force && adbForwardReady) return;

  await ensureAdbServer();
  const status = await refreshAdbDeviceStatus(force);
  if (status !== 'device') {
    throw new Error(adbStatusError(status));
  }

  try {
    const { stdout } = await adbExec(['forward', '--list']);
    if (stdout.includes(`tcp:${ADB_TCP_PORT}`) && stdout.includes(ADB_SOCKET_NAME)) {
      adbForwardReady = true;
      return;
    }
  } catch {
    // fall through and recreate the forward
  }

  await adbExec(['forward', '--remove', `tcp:${ADB_TCP_PORT}`]).catch(() => {});
  await adbExec([
    'forward',
    `tcp:${ADB_TCP_PORT}`,
    `localabstract:${ADB_SOCKET_NAME}`,
  ]);
  adbForwardReady = true;
}

function pingAdbTcp() {
  return new Promise((resolve, reject) => {
    let response = '';
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(connectTimer);
      fn(value);
    };

    const socket = net.createConnection({ host: '127.0.0.1', port: ADB_TCP_PORT });
    const connectTimer = setTimeout(() => {
      socket.destroy();
      finish(reject, new Error(
        'USB forward to phone is not ready. Open ERP POS, wait for "ADB Ready", then click Connect USB again.',
      ));
    }, 8000);
    socket.setTimeout(10000);
    socket.setNoDelay(true);

    socket.on('connect', () => {
      clearTimeout(connectTimer);
      socket.write('PING\n', 'utf8');
    });

    socket.on('data', (chunk) => {
      response += chunk.toString('utf8');
      if (response.includes('\n')) socket.end();
    });

    socket.on('timeout', () => {
      socket.destroy();
      finish(reject, new Error(
        'Phone ADB listener is not ready. Open the ERP POS app on your phone (keep it in the foreground), then click Connect USB again.',
      ));
    });

    socket.on('error', (err) => {
      const code = err && err.code ? String(err.code) : '';
      const hint = code === 'ECONNREFUSED'
        ? 'USB forward is not ready yet. Open ERP POS, wait for "ADB Ready", then click Connect USB again.'
        : 'Open the ERP POS app, wait for the "ADB Ready" notification, then try again.';
      finish(reject, new Error(
        'Cannot reach phone over ADB. ' + hint + ' Details: ' + (err.message || err),
      ));
    });

    socket.on('end', () => {
      if (response.trim() === 'OK') {
        finish(resolve, { ok: true, adbReady: true });
        return;
      }
      finish(reject, new Error(
        'Phone ADB listener returned an unexpected response. Open ERP POS and try Connect USB again.',
      ));
    });
  });
}

function sendViaAdbTcp(payloadStr) {
  return new Promise((resolve, reject) => {
    let response = '';
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(connectTimer);
      fn(value);
    };

    const socket = net.createConnection({ host: '127.0.0.1', port: ADB_TCP_PORT });
    const connectTimer = setTimeout(() => {
      socket.destroy();
      finish(reject, new Error(
        'USB link to phone failed. Open ERP POS, wait for "ADB Ready", then try Send again.',
      ));
    }, 8000);
    socket.setTimeout(20000);
    socket.setNoDelay(true);

    socket.on('connect', () => {
      clearTimeout(connectTimer);
      socket.write(payloadStr + '\n', 'utf8');
    });

    socket.on('data', (chunk) => {
      response += chunk.toString('utf8');
      if (response.includes('\n')) {
        socket.end();
      }
    });

    socket.on('timeout', () => {
      socket.destroy();
      finish(reject, new Error(
        'Phone did not respond over ADB. Open the ERP POS app and wait for "ADB Ready", then try Send again.',
      ));
    });

    socket.on('error', (err) => {
      const code = err && err.code ? String(err.code) : '';
      const hint = code === 'ECONNRESET'
        ? 'The phone closed the ADB connection. Open ERP POS, wait for "ADB Ready", then click Connect USB again.'
        : 'Open the ERP POS app and wait for "ADB Ready".';
      finish(reject, new Error(
        'Could not send over USB (ADB). ' + hint + ' Details: ' + (err.message || err),
      ));
    });

    socket.on('end', () => {
      const trimmed = response.trim();
      if (trimmed === 'OK') {
        finish(resolve, { ok: true, channel: 'adb-tcp' });
      } else if (trimmed === 'ERR') {
        finish(reject, new Error('Phone received the order but could not save it. Open the ERP POS app and try Send again.'));
      } else if (!trimmed) {
        finish(reject, new Error('Phone closed ADB before confirming the order. Open ERP POS, wait for "ADB Ready", then try again.'));
      } else {
        finish(reject, new Error('Phone ADB listener returned an unexpected response. Open ERP POS and try Connect USB again.'));
      }
    });
  });
}

function adbStatusError(status) {
  if (status === 'unauthorized') {
    return 'Phone USB debugging is not allowed yet. On the phone, tap Allow when the "Allow USB debugging?" popup appears, then click Connect USB again.';
  }
  if (status === 'offline') {
    return 'Phone is connected but ADB shows offline. Unplug the USB cable, plug it back in, unlock the phone, then click Connect USB again.';
  }
  return 'No Android phone detected over USB. Plug in the phone, turn on USB debugging in Developer options, then click Connect USB again.';
}

async function pingViaAdb() {
  await ensureAdbServer();
  const status = await refreshAdbDeviceStatus(true);
  if (status !== 'device') {
    throw new Error(adbStatusError(status));
  }
  await refreshAdbDeviceName();

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await ensureAdbForward(true);
      const result = await pingAdbTcp();
      adbCache.phoneReady = true;
      adbCache.phoneReadyAt = Date.now();
      return withDeviceInfo({ ...result, verified: true });
    } catch (err) {
      adbCache.phoneReady = false;
      if (attempt === 3) throw err;
      adbForwardReady = false;
      if (attempt >= 2) await wakeErpPosApp();
      await sleep(400 * attempt);
    }
  }
  throw new Error('ADB bridge ping failed.');
}

async function wakeErpPosApp() {
  try {
    await adbExec([
      'shell', 'am', 'start',
      '-a', 'android.intent.action.MAIN',
      '-c', 'android.intent.category.LAUNCHER',
      '-n', 'com.erppos/.MainActivity',
    ]);
    await sleep(900);
  } catch {
    // app may already be open
  }
}

async function prepareAdb() {
  await ensureAdbServer();
  const status = await refreshAdbDeviceStatus(true);
  if (status !== 'device') {
    return { ok: false, adbReady: false, adbStatus: status, message: adbStatusError(status) };
  }
  await refreshAdbDeviceName();
  await ensureAdbForward(true);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await pingAdbTcp();
      adbCache.phoneReady = true;
      adbCache.phoneReadyAt = Date.now();
      return withDeviceInfo({
        ok: true,
        adbReady: true,
        prepared: true,
        launched: attempt > 1,
        ...result,
      });
    } catch (err) {
      if (attempt === 3) {
        adbCache.phoneReady = false;
        return {
          ok: false,
          adbReady: false,
          message: err.message || 'Open ERP POS on your phone and wait for the "ADB Ready" notification.',
        };
      }
      adbForwardReady = false;
      await wakeErpPosApp();
      await sleep(600);
      await ensureAdbForward(true);
    }
  }
  return {
    ok: false,
    adbReady: false,
    message: 'USB link to phone failed. Open ERP POS, wait for "ADB Ready", then click Connect USB again.',
  };
}

async function warmAdbLink() {
  const status = await refreshAdbDeviceStatus(true);
  if (status !== 'device') {
    adbForwardReady = false;
    adbCache.phoneReady = false;
    return false;
  }
  await ensureAdbForward();
  try {
    await pingAdbTcp();
    adbCache.phoneReady = true;
    adbCache.phoneReadyAt = Date.now();
    return true;
  } catch {
    adbCache.phoneReady = false;
    return false;
  }
}

async function sendViaAdb(payloadStr) {
  const status = await refreshAdbDeviceStatus();
  if (status !== 'device') {
    throw new Error(adbStatusError(status));
  }
  await refreshAdbDeviceName();
  await ensureAdbForward();
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const result = await sendViaAdbTcp(payloadStr);
      adbCache.phoneReady = true;
      adbCache.phoneReadyAt = Date.now();
      return withDeviceInfo(result);
    } catch (err) {
      if (attempt === 4) throw err;
      adbForwardReady = false;
      await sleep(500);
      await ensureAdbForward(true);
    }
  }
  throw new Error('ADB send failed after retries.');
}

function waitForNoblePowerOn() {
  return new Promise((resolve, reject) => {
    if (!noble) {
      reject(new Error('PC Bluetooth bridge is not available on this machine.'));
      return;
    }
    if (noble.state === 'poweredOn') {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      noble.removeListener('stateChange', onState);
      reject(new Error('Turn on Bluetooth on your PC, then restart bridge-server (npm start).'));
    }, 10000);
    function onState(state) {
      if (state === 'poweredOn') {
        clearTimeout(timer);
        noble.removeListener('stateChange', onState);
        resolve();
      } else if (state === 'unsupported') {
        clearTimeout(timer);
        noble.removeListener('stateChange', onState);
        reject(new Error('PC Bluetooth is not supported on this machine.'));
      }
    }
    noble.on('stateChange', onState);
  });
}

function matchesErpPos(peripheral) {
  const name = peripheral.advertisement.localName || '';
  const svcNorm = SERVICE_UUID.replace(/-/g, '').toLowerCase();
  const uuids = (peripheral.advertisement.serviceUuids || []).map((u) => u.replace(/-/g, '').toLowerCase());
  if (BLE_DEVICE_NAMES.some((n) => name.includes(n))) return true;
  return uuids.some((u) => u.includes(svcNorm.slice(0, 8)));
}

function scanForPeripheral() {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      noble.stopScanning();
      noble.removeListener('discover', onDiscover);
      reject(new Error(
        'No ERP POS phone found over Bluetooth. Open the Android app → Start Receiving → wait for "BLE Ready".',
      ));
    }, SCAN_TIMEOUT_MS);

    function onDiscover(peripheral) {
      if (!matchesErpPos(peripheral)) return;
      clearTimeout(timer);
      noble.stopScanning();
      noble.removeListener('discover', onDiscover);
      resolve(peripheral);
    }

    noble.on('discover', onDiscover);
    noble.startScanning([], true);
  });
}

function writePayload(peripheral, payloadStr) {
  return new Promise((resolve, reject) => {
    peripheral.connect((connectErr) => {
      if (connectErr) {
        reject(new Error('Could not connect to phone over Bluetooth: ' + connectErr.message));
        return;
      }

      peripheral.discoverSomeServicesAndCharacteristics(
        [SERVICE_UUID],
        [CHAR_UUID],
        async (discoverErr, _services, characteristics) => {
          if (discoverErr) {
            peripheral.disconnect();
            reject(new Error('Could not find ERP POS service on phone: ' + discoverErr.message));
            return;
          }

          const characteristic = characteristics[0];
          if (!characteristic) {
            peripheral.disconnect();
            reject(new Error('ERP POS is not ready on the phone. Open the app and tap Start Receiving first.'));
            return;
          }

          try {
            const chunks = buildBleChunks(payloadStr);
            for (const chunk of chunks) {
              await new Promise((res, rej) => {
                characteristic.write(chunk, false, (writeErr) => (writeErr ? rej(writeErr) : res()));
              });
              await sleep(50);
            }
            peripheral.disconnect();
            resolve();
          } catch (writeErr) {
            try { peripheral.disconnect(); } catch (_) { /* ignore */ }
            reject(new Error('Failed to send order to phone: ' + (writeErr.message || writeErr)));
          }
        },
      );
    });
  });
}

async function sendViaBle(payloadStr) {
  await waitForNoblePowerOn();
  const peripheral = await scanForPeripheral();
  await writePayload(peripheral, payloadStr);
  return { ok: true, channel: 'ble' };
}

async function handleAction(action, payloadStr) {
  if (action === 'ping') {
    return pingViaAdb();
  }

  if (action === 'prepare') {
    const result = await prepareAdb();
    if (!result.adbReady) {
      throw new Error(result.message || 'Could not prepare USB link to phone.');
    }
    return result;
  }

  if (!payloadStr) {
    throw new Error('No order payload to send.');
  }

  if (action === 'send') {
    return sendViaAdb(payloadStr);
  }

  if (action === 'send_bt') {
    if (noble) {
      return sendViaBle(payloadStr);
    }
    throw new Error(
      'PC Bluetooth is not available. Use Connect USB on the web POS, or install Bluetooth support and restart bridge-server.',
    );
  }

  throw new Error('Unknown bridge action: ' + action);
}

function attachBridgeSocket(ws) {
  ws.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      ws.send(JSON.stringify({ error: 'Invalid message from web POS.' }));
      return;
    }

    try {
      const result = await handleAction(msg.action, msg.payload || '');
      ws.send(JSON.stringify(result));
    } catch (err) {
      ws.send(JSON.stringify({ error: err.message || String(err) }));
    }
  });
}

function sendJson(res, statusCode, body, extraHeaders) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    ...extraHeaders,
  };
  res.writeHead(statusCode, headers);
  res.end(JSON.stringify(body));
}

function serveStaticFile(req, res) {
  let urlPath = (req.url || '/').split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.normalize(path.join(WEB_ROOT, urlPath));
  if (!filePath.startsWith(WEB_ROOT)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (urlPath !== '/index.html') {
        fs.readFile(path.join(WEB_ROOT, 'index.html'), (indexErr, indexData) => {
          if (indexErr) {
            sendJson(res, 404, { error: 'Not found' });
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(indexData);
        });
        return;
      }
      sendJson(res, 404, { error: 'Not found' });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const headers = { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' };
    if (ext === '.html') {
      headers['Cache-Control'] = 'no-store, no-cache, must-revalidate';
    }
    res.writeHead(200, headers);
    res.end(data);
  });
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const httpServer = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  if (urlPath === '/api/bridge-health') {
    sendJson(res, 200, { ok: true, bridge: 'running', bleScan: !!noble });
    return;
  }

  if (urlPath === '/api/adb-status') {
    sendJson(res, 200, {
      ok: true,
      adbDevice: adbCache.status,
      phoneReady: adbCache.phoneReady,
      forwardReady: adbForwardReady,
      deviceName: adbCache.deviceName || '',
    });
    return;
  }

  if (urlPath === '/api/adb-ping') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }
    pingViaAdb()
      .then((result) => sendJson(res, 200, result))
      .catch((err) => sendJson(res, 200, {
        ok: false,
        adbReady: false,
        verified: false,
        error: err.message || String(err),
      }));
    return;
  }

  if (urlPath === '/api/adb-send') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }
    readRequestBody(req)
      .then(async (body) => {
        let payloadStr = body;
        try {
          const parsed = JSON.parse(body);
          if (parsed && typeof parsed.payload === 'string') payloadStr = parsed.payload;
        } catch {
          // use raw body as payload
        }
        if (!payloadStr) {
          sendJson(res, 400, { ok: false, error: 'No order payload to send.' });
          return;
        }
        try {
          const result = await sendViaAdb(payloadStr);
          sendJson(res, 200, { ...result, verified: true });
        } catch (err) {
          sendJson(res, 200, { ok: false, error: err.message || String(err) });
        }
      })
      .catch((err) => sendJson(res, 500, { ok: false, error: err.message || String(err) }));
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  serveStaticFile(req, res);
});

const wssOnHttp = new WebSocketServer({ server: httpServer, path: '/ws' });
wssOnHttp.on('connection', attachBridgeSocket);

function startLegacyWs() {
  const legacyHttp = http.createServer((req, res) => {
    if ((req.url || '').split('?')[0] === '/api/bridge-health') {
      sendJson(res, 200, { ok: true, bridge: 'running' });
      return;
    }
    res.writeHead(404);
    res.end();
  });
  const wssLegacy = new WebSocketServer({ server: legacyHttp });
  wssLegacy.on('connection', attachBridgeSocket);
  legacyHttp.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.log('Legacy ws://localhost:' + WS_LEGACY_PORT + ' already in use — using ws://localhost:' + HTTP_PORT + '/ws only.');
      return;
    }
    console.error('Legacy bridge error:', err.message || err);
  });
  wssLegacy.on('error', () => {
    // handled via legacyHttp error when port is already in use
  });
  legacyHttp.listen(WS_LEGACY_PORT, () => {
    console.log('Legacy bridge WebSocket: ws://localhost:' + WS_LEGACY_PORT);
  });
}

httpServer.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error('Port ' + HTTP_PORT + ' is already in use. Close the other ERP POS window or run: taskkill /F /IM node.exe');
    process.exit(1);
  }
  console.error('HTTP server error:', err.message || err);
  process.exit(1);
});

async function watchAdbDevices() {
  const prev = adbCache.status;
  const status = await refreshAdbDeviceStatus(true);
  if (status === 'device') {
    if (prev !== 'device' || !adbForwardReady || !adbCache.phoneReady) {
      adbForwardReady = false;
      await ensureAdbForward(true).catch(() => {});
      await warmAdbLink().catch(() => {});
    }
  } else {
    adbForwardReady = false;
    adbCache.phoneReady = false;
  }
}

httpServer.listen(HTTP_PORT, async () => {
  startLegacyWs();
  console.log('ERP POS web UI: http://localhost:' + HTTP_PORT);
  console.log('Bridge WebSocket: ws://localhost:' + HTTP_PORT + '/ws (or ws://localhost:' + WS_LEGACY_PORT + ')');
  console.log('ADB: ' + ADB_BIN);
  console.log('ADB TCP relay port: ' + ADB_TCP_PORT + (noble ? ' (BLE scan available)' : ' (ADB only)'));
  await ensureAdbServer();
  watchAdbDevices().catch(() => {});
  setInterval(() => { watchAdbDevices().catch(() => {}); }, 3000);
  setInterval(() => { warmAdbLink().catch(() => {}); }, ADB_WARM_INTERVAL_MS);
});
