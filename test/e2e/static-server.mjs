/* Tiny zero-dependency static file server for the UI tests. Serves dist/
   with an SPA fallback (unknown paths -> index.html), like Vercel does.
   Port 0 = let the OS pick a free port, so tests never collide. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

export function startStaticServer(root, port = 0) {
  const abs = path.resolve(root);
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(abs, urlPath);
    if (!file.startsWith(abs)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    // Vercel-only scripts (analytics) don't exist locally — 404 them like any
    // host without them would, instead of answering with index.html.
    if (urlPath.startsWith('/_vercel/')) { res.writeHead(404).end(); return; }
    if (!fs.existsSync(file)) file = path.join(abs, 'index.html');
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => {
    server.listen(port, '127.0.0.1', () => {
      resolve({
        url: `http://127.0.0.1:${server.address().port}`,
        close: () => new Promise(r => server.close(r)),
      });
    });
  });
}
