const fs = require('fs');
const path = require('path');

const webRoot = path.join(__dirname, '..');
const distDir = path.join(webRoot, 'dist');

const SKIP = new Set([
  'node_modules',
  'dist',
  'scripts',
  'web',
  '.env',
  'package.json',
  'package-lock.json',
  'vercel.json',
]);

function removeDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

const apiUrl = (process.env.AUTOHUB_API_URL || '').trim().replace(/\/$/, '');
const envOut = path.join(webRoot, 'js', 'env.js');
fs.writeFileSync(
  envOut,
  `// Generated at build time — do not edit\nwindow.AUTOHUB_API_URL = ${JSON.stringify(apiUrl)};\n`,
  'utf8',
);

removeDir(distDir);
fs.mkdirSync(distDir, { recursive: true });

for (const name of fs.readdirSync(webRoot)) {
  if (SKIP.has(name)) continue;
  fs.cpSync(path.join(webRoot, name), path.join(distDir, name), { recursive: true });
}

const required = ['index.html', 'css/main.css', 'js/config.js', 'js/api.js'];
const missing = required.filter((rel) => !fs.existsSync(path.join(distDir, rel)));

if (missing.length) {
  console.error('Build failed — missing in dist/:', missing.join(', '));
  process.exit(1);
}

console.log(`Build OK → dist/ (${fs.readdirSync(distDir).length} top-level items)`);
console.log(apiUrl ? `AUTOHUB_API_URL → ${apiUrl}` : 'AUTOHUB_API_URL → not set (add it in Vercel env vars)');
