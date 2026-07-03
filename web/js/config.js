// API base URL — supports deploy override, LAN, and local dev
function resolveApiUrl() {
  if (window.AUTOHUB_API_URL) return window.AUTOHUB_API_URL.replace(/\/$/, '');

  const { protocol, hostname, port } = window.location;

  if (protocol === 'file:') {
    return 'http://localhost:4000';
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://${hostname}:4000`;
  }

  // Same machine / LAN — API on port 4000
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.endsWith('.local')) {
    return `${protocol}//${hostname}:4000`;
  }

  // Vercel / hosted without AUTOHUB_API_URL — caller shows a clear setup message
  if (hostname.endsWith('.vercel.app') || hostname.endsWith('.vercel.sh')) {
    return '';
  }

  // Production fallback (reverse proxy /api on same host)
  return `${protocol}//${hostname}${port ? `:${port}` : ''}/api`.replace(/\/api\/api$/, '/api');
}

const API_URL = resolveApiUrl();
