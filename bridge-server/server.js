'use strict';

const net = require('net');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { WebSocketServer } = require('ws');

const execFileAsync = promisify(execFile);

const WS_PORT = 8080;
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

async function adbHasDevice() {
  try {
    const { stdout } = await execFileAsync('adb', ['devices']);
    return stdout.split('\n').some((line) => {
      const trimmed = line.trim();
      return trimmed.endsWith('\tdevice') || (trimmed.endsWith('device') && !trimmed.startsWith('List'));
    });
  } catch {
    return false;
  }
}

async function ensureAdbForward() {
  await execFileAsync('adb', ['forward', '--remove', `tcp:${ADB_TCP_PORT}`]).catch(() => {});
  await execFileAsync('adb', [
    'forward',
    `tcp:${ADB_TCP_PORT}`,
    `localabstract:${ADB_SOCKET_NAME}`,
  ]);
}

function pingAdbTcp() {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: '127.0.0.1', port: ADB_TCP_PORT }, () => {
      socket.end();
      resolve({ ok: true, adbReady: true });
    });
    socket.setTimeout(5000);
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error(
        'Phone ADB listener is not ready. Open the ERP POS app on your phone (keep it in the foreground), then click Connect USB again.',
      ));
    });
    socket.on('error', (err) => {
      reject(new Error(
        'Cannot reach phone over ADB. Open the ERP POS app, wait for the "ADB Ready" notification, then try again. Details: ' + (err.message || err),
      ));
    });
  });
}

function sendViaAdbTcp(payloadStr) {
  return new Promise((resolve, reject) => {
    let response = '';
    const socket = net.createConnection({ host: '127.0.0.1', port: ADB_TCP_PORT }, () => {
      if (!payloadStr) {
        socket.end();
        return;
      }
      socket.write(payloadStr + '\n', 'utf8');
    });
    socket.setTimeout(10000);
    socket.on('data', (chunk) => {
      response += chunk.toString('utf8');
      if (response.includes('\n')) {
        socket.end();
        if (response.trim() === 'OK') {
          resolve({ ok: true, channel: 'adb-tcp' });
        } else {
          reject(new Error(
            'Phone received the order but could not save it. Open the ERP POS app and try Send again.',
          ));
        }
      }
    });
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error(
        'Phone did not respond over ADB. Open the ERP POS app and wait for "ADB Ready", then try Send again.',
      ));
    });
    socket.on('error', (err) => {
      reject(new Error(
        'Could not send over USB (ADB). Open the ERP POS app and wait for "ADB Ready". Details: ' + (err.message || err),
      ));
    });
    socket.on('end', () => {
      if (!payloadStr) {
        resolve({ ok: true, adbReady: true });
        return;
      }
      if (response.trim() === 'OK') {
        resolve({ ok: true, channel: 'adb-tcp' });
      } else if (!response.includes('OK')) {
        reject(new Error(
          'Phone received the order but could not save it. Open the ERP POS app and try Send again.',
        ));
      }
    });
  });
}

async function pingViaAdb() {
  const hasAdb = await adbHasDevice();
  if (!hasAdb) {
    throw new Error(
      'No Android phone detected over USB. Plug in the phone, turn on USB debugging, tap Allow on the phone, then run: adb devices',
    );
  }
  await ensureAdbForward();
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await pingAdbTcp();
    } catch (err) {
      if (attempt === 3) throw err;
      await sleep(600);
      await ensureAdbForward();
    }
  }
  throw new Error('ADB bridge ping failed.');
}

async function sendViaAdb(payloadStr) {
  const hasAdb = await adbHasDevice();
  if (!hasAdb) {
    throw new Error(
      'No Android phone detected over USB. Plug in the phone, turn on USB debugging, tap Allow on the phone, then run: adb devices',
    );
  }
  await ensureAdbForward();
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await sendViaAdbTcp(payloadStr);
    } catch (err) {
      if (attempt === 3) throw err;
      await sleep(600);
      await ensureAdbForward();
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

const wss = new WebSocketServer({ port: WS_PORT });
console.log('ERP POS bridge server listening on ws://localhost:' + WS_PORT);
console.log('ADB TCP relay port: ' + ADB_TCP_PORT + (noble ? ' (BLE scan available)' : ' (ADB only)'));

wss.on('connection', (ws) => {
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
});
