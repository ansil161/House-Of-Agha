const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  let url = req.url.split('?')[0];

  // Route aliases for local preview
  if (url === '/' || url === '/index' || url === '/index.html') {
    url = 'index.html';
  } else if (url === '/collections/all' || url === '/collections' || url === '/shop' || url === '/shop.html') {
    url = 'shop.html';
  } else if (url.startsWith('/products/') || url === '/product' || url === '/product.html') {
    url = 'product.html';
  } else if (url === '/pages/the-house' || url === '/pages/about' || url === '/the-house' || url === '/the-house.html') {
    url = 'the-house.html';
  } else if (url === '/pages/private-access' || url === '/private-access' || url === '/private-access.html') {
    url = 'private-access.html';
  } else if (url === '/pages/contact' || url === '/contact' || url === '/contact.html') {
    url = 'contact.html';
  } else if (url === '/pages/faq' || url === '/faq' || url === '/faq.html') {
    url = 'faq.html';
  } else if (url === '/pages/shipping-returns' || url === '/shipping-returns' || url === '/shipping-returns.html') {
    url = 'shipping-returns.html';
  } else if (url.startsWith('/')) {
    url = url.substring(1);
  }

  let filePath = path.join(__dirname, url);
  let ext = path.extname(filePath);
  let contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { background: #080808; color: #F5F5F3; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; }
              a { color: #9A9A9A; text-decoration: underline; margin-top: 16px; }
            </style>
          </head>
          <body>
            <h1>404 — Page Not Found</h1>
            <p>AGHA PERFUMES — Page under composition</p>
            <a href="/">Return to Home</a>
          </body>
          </html>
        `, 'utf-8');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache' });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`AGHA Perfumes Storefront preview running at http://localhost:${PORT}`);
});
