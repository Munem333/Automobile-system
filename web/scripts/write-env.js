const fs = require('fs');
const path = require('path');

const apiUrl = (process.env.AUTOHUB_API_URL || '').trim().replace(/\/$/, '');
const webRoot = path.join(__dirname, '..');
const out = path.join(webRoot, 'js', 'env.js');

const content = `// Generated at build time — do not edit
window.AUTOHUB_API_URL = ${JSON.stringify(apiUrl)};
`;

fs.writeFileSync(out, content, 'utf8');
console.log(apiUrl ? `env.js → ${apiUrl}` : 'env.js → (empty — set AUTOHUB_API_URL on Vercel)');

// Root Directory is "web" but Project Settings may still expect Output Directory "web".
// Mirror site files into web/web so Vercel finds them in either configuration.
if (process.env.VERCEL) {
  const nestedWeb = path.join(webRoot, 'web');
  if (!fs.existsSync(nestedWeb)) {
    try {
      fs.symlinkSync('.', nestedWeb, 'dir');
      console.log('Vercel: created web/ output mirror (symlink)');
    } catch {
      fs.mkdirSync(nestedWeb, { recursive: true });
      for (const name of fs.readdirSync(webRoot)) {
        if (name === 'web' || name === 'node_modules') continue;
        fs.cpSync(path.join(webRoot, name), path.join(nestedWeb, name), { recursive: true });
      }
      console.log('Vercel: created web/ output mirror (copy)');
    }
  }
}
