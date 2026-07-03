const fs = require('fs');
const path = require('path');

const webRoot = path.join(__dirname, '..');

const apiUrl = (process.env.AUTOHUB_API_URL || '').trim().replace(/\/$/, '');
const envOut = path.join(webRoot, 'js', 'env.js');

fs.writeFileSync(
  envOut,
  `// Generated at build time — do not edit\nwindow.AUTOHUB_API_URL = ${JSON.stringify(apiUrl)};\n`,
  'utf8',
);

const required = ['index.html', 'css/main.css', 'js/config.js', 'js/api.js'];
const missing = required.filter((rel) => !fs.existsSync(path.join(webRoot, rel)));

if (missing.length) {
  console.error('Build failed — missing files:', missing.join(', '));
  process.exit(1);
}

console.log('Build OK — static site ready');
console.log(apiUrl ? `AUTOHUB_API_URL → ${apiUrl}` : 'AUTOHUB_API_URL → not set (add it in Vercel env vars)');
