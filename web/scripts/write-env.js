const fs = require('fs');
const path = require('path');

const apiUrl = (process.env.AUTOHUB_API_URL || '').trim().replace(/\/$/, '');
const out = path.join(__dirname, '..', 'js', 'env.js');

const content = `// Generated at build time — do not edit
window.AUTOHUB_API_URL = ${JSON.stringify(apiUrl)};
`;

fs.writeFileSync(out, content, 'utf8');
console.log(apiUrl ? `env.js → ${apiUrl}` : 'env.js → (empty — set AUTOHUB_API_URL on Vercel)');
