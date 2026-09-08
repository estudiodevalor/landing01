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

// Documentación y archivos de configuración: viven en el repo para que
// quien despliegue los lea, pero no son parte del sitio y no deben poder
// pedirse por HTTP. Se tratan igual que una ruta inexistente (mismo 404 /
// fallback a index.html) para no revelar que existen.
const DENYLIST = new Set([
  'readme.md', 'despliegue.md', 'package.json', 'package-lock.json',
  'railway.json', 'procfile', '.gitignore', '.env'
]);

// Cabeceras de seguridad para todas las respuestas.
// El framework de la página ejecuta componentes con `new Function(...)`
// (equivalente a eval), por lo que script-src necesita 'unsafe-eval' y
// 'unsafe-inline'; de lo contrario el sitio deja de renderizar.
// Contentsquare necesita SUS DOS dominios, no solo uno:
//   *.contentsquare.net -> el tag (t.), los recursos (srm.ba.) y la
//                          recoleccion de datos (c.ba., k.ba., q.ba., r., l.)
//   *.contentsquare.com -> tcvsapi. (reporta el resultado de "Verify
//                          installation") y app. (uxaDomain)
// Sin el .com la verificacion falla con "Error reporting verification
// results" aunque el tag este bien puesto y midiendo.
// worker-src se declara aparte porque no hereda de script-src sino de
// default-src, y el session replay crea workers desde blob:.
// Google Ads (gtag.js, AW-992279025) tambien reparte su trafico entre
// varios dominios:
//   googletagmanager.com   -> gtag/js (el tag base)
//   googleadservices.com   -> conversion_async.js y /pagead/conversion/
//   *.doubleclick.net      -> conversion linker y pixel de remarketing
//   google-analytics.com / *.analytics.google.com -> pings de gtag
//   google.com / google.com.mx -> pixel de conversion regionalizado
// frame-src se declara aparte (no hereda de default-src) porque el
// conversion linker inserta un iframe oculto de td.doubleclick.net.
const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), camera=(), microphone=(), payment=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://unpkg.com https://static.cloudflareinsights.com https://*.contentsquare.net https://*.contentsquare.com https://www.googletagmanager.com https://www.googleadservices.com https://*.doubleclick.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' blob: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.contentsquare.net https://*.contentsquare.com https://www.googletagmanager.com https://www.google-analytics.com https://www.googleadservices.com https://*.doubleclick.net https://www.google.com https://www.google.com.mx",
    "connect-src 'self' https://unpkg.com https://cloudflareinsights.com https://*.contentsquare.net https://*.contentsquare.com https://www.googletagmanager.com https://www.google-analytics.com https://*.analytics.google.com https://*.doubleclick.net https://www.googleadservices.com https://www.google.com https://www.google.com.mx",
    "worker-src 'self' blob:",
    "frame-src 'self' https://*.doubleclick.net https://www.googletagmanager.com",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "object-src 'none'"
  ].join('; ')
};

// Sirve `urlPath` desde `root`, cayendo a `root/index.html` si el archivo no
// existe (comportamiento de sitio de una sola página).
function serveFrom(root, urlPath, res) {
  const safe = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(root, safe);
  if (!filePath.startsWith(root)) {
    res.writeHead(403, SECURITY_HEADERS);
    res.end('Forbidden');
    return;
  }

  const serveFallback = () => {
    fs.readFile(path.join(root, 'index.html'), (e2, d2) => {
      if (e2) { res.writeHead(404, { ...SECURITY_HEADERS, 'Cache-Control': 'no-store' }); res.end('Not found'); return; }
      res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(d2);
    });
  };

  // Cualquier segmento oculto (.git, .env, ...) o archivo en la lista negra
  // se trata como si no existiera.
  const segments = safe.split(/[/\\]/);
  const basename = path.basename(filePath).toLowerCase();
  if (segments.some(seg => seg.startsWith('.')) || DENYLIST.has(basename)) {
    serveFallback();
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) { serveFallback(); return; }
    const ext = path.extname(filePath).toLowerCase();
    // Cache corto para HTML (siempre revalida); cache más largo para
    // assets estáticos (imágenes, íconos, fuentes).
    const cacheControl = ext === '.html' ? 'no-cache' : 'public, max-age=3600';
    res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': cacheControl });
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
      res.writeHead(301, { ...SECURITY_HEADERS, Location: '/cicrei/' });
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
    res.writeHead(500, SECURITY_HEADERS);
    res.end('Server error');
  }
});

server.listen(PORT, () => {
  console.log('Estudio de Valor — sirviendo en el puerto ' + PORT);
});
