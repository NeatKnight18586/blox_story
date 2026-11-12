// scripts/v2/server.js — tiny static server for the v2 engine pages (repo root, no hidden paths, no
// escaping the root). Same contract as scripts/pipeline/server.js, plus fonts and audio types.
import http from 'node:http';
import path from 'node:path';
import {realpath, stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';

const TYPES = {'.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.flac': 'audio/flac', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.md': 'text/plain'};

export async function startServer(root = process.cwd()) {
  root = await realpath(root);
  const server = http.createServer(async (req, res) => {
    try {
      if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
      const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (rel.split('/').some(p => p.startsWith('.'))) throw Error('hidden');
      let file = path.resolve(root, '.' + rel);
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
      file = await realpath(file); if (!file.startsWith(root + path.sep)) throw Error('outside root');
      const type = TYPES[path.extname(file)]; if (!type) throw Error('type');
      res.writeHead(200, {'content-type': type, 'content-length': (await stat(file)).size, 'cache-control': 'no-store'});
      if (req.method === 'HEAD') res.end(); else createReadStream(file).on('error', () => res.destroy()).pipe(res);
    } catch { if (!res.headersSent) res.writeHead(404).end(); else res.destroy(); }
  });
  await new Promise((ok, no) => { server.once('error', no); server.listen(0, '127.0.0.1', ok); });
  return {url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(ok => { server.close(ok); server.closeAllConnections(); })};
}
