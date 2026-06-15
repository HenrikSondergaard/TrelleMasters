// ============================================================
//  Lokal förhandsvisning av den statiska sajten
//  Kör:  npm run serve   →  http://localhost:8080
//  Ange annan port:  PORT=3000 npm run serve
//  Beroendefri — använder bara Nodes inbyggda moduler.
// ============================================================
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = process.cwd();
const PORT = Number(process.env.PORT) || 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const server = createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
    if (pathname === '/' || pathname.endsWith('/')) pathname += 'index.html';
    // Prevent path traversal, then resolve under the project root.
    const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
    const filePath = join(ROOT, safe);
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': TYPES[extname(filePath)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`TrelleMasters förhandsvisning körs på http://localhost:${PORT}`);
  console.log('Avsluta med Ctrl+C.');
});
