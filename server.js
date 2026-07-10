// Servidor estático mínimo, sin dependencias.
// Railway define la variable de entorno PORT automáticamente.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
// Landing de preinscripción CICREI, aislada en su propia carpeta y servida
// bajo /cicrei/ dentro del mismo sitio (mismo dominio, sin proxy externo).
const CICREI_ROOT = path.join(__dirname, 'cicrei');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif':  'image/gif',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.txt':  'text/plain; charset=utf-8'
};

// Sirve `urlPath` desde `root`, cayendo a `root/index.html` si el archivo no
// existe (comportamiento de sitio de una sola página).
function serveFrom(root, urlPath, res) {
  const safe = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(root, safe);
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(root, 'index.html'), (e2, d2) => {
        if (e2) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(d2);
      });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);

    // "/cicrei" sin slash final redirige a "/cicrei/" para que las rutas
    // relativas del HTML de esa landing (assets/logo-cicrei.png, etc.)
    // resuelvan contra el subpath y no contra la raíz del dominio.
    if (urlPath === '/cicrei') {
      res.writeHead(301, { Location: '/cicrei/' });
      res.end();
      return;
    }
    if (urlPath === '/cicrei/' || urlPath.startsWith('/cicrei/')) {
      const sub = urlPath === '/cicrei/' ? '/index.html' : urlPath.slice('/cicrei'.length);
      serveFrom(CICREI_ROOT, sub, res);
      return;
    }

    if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
    serveFrom(ROOT, urlPath, res);
  } catch (e) {
    res.writeHead(500);
    res.end('Server error');
  }
});

server.listen(PORT, () => {
  console.log('Estudio de Valor — sirviendo en el puerto ' + PORT);
});
