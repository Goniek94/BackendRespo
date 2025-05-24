// Prosty serwer HTTP do serwowania plików statycznych
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm',
  '.jsx': 'text/javascript'
};

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // Normalizacja ścieżki URL
  let filePath = '.' + req.url;
  if (filePath === './') {
    filePath = './index.html';
  }
  
  // Określenie rozszerzenia pliku
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';
  
  // Odczytanie pliku
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // Plik nie istnieje
        fs.readFile('./index.html', (error, content) => {
          if (error) {
            // Nie można odczytać pliku index.html
            res.writeHead(500);
            res.end('Błąd serwera: ' + error.code);
          } else {
            // Zwróć index.html jako fallback
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content, 'utf-8');
          }
        });
      } else {
        // Inny błąd serwera
        res.writeHead(500);
        res.end('Błąd serwera: ' + error.code);
      }
    } else {
      // Sukces - zwróć plik
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Serwer uruchomiony na http://localhost:${PORT}`);
  console.log(`Otwórz http://localhost:${PORT} w przeglądarce`);
});
