require('dotenv').config();
const http = require('http');
const https = require('https');
const net = require('net');
const url = require('url');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;

// Servidor HTTP proxy
const server = http.createServer((req, res) => {
  // Health check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', uptime: process.uptime() }));
    return;
  }

  // Info endpoint
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      service: 'HTTP Proxy Service',
      version: '1.0.0',
      status: 'running'
    }));
    return;
  }

  // HTTP Proxy - manejar requests HTTP directos
  logger.info(`HTTP Proxy: ${req.method} ${req.url}`);

  try {
    const parsedUrl = new URL(req.url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname + parsedUrl.search,
      method: req.method,
      headers: { ...req.headers, host: parsedUrl.hostname }
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      logger.error(`Proxy error: ${err.message}`);
      res.writeHead(502);
      res.end('Bad Gateway');
    });

    req.pipe(proxyReq);
  } catch (err) {
    logger.error(`Request error: ${err.message}`);
    res.writeHead(400);
    res.end('Bad Request');
  }
});

// Soporte para CONNECT method (HTTPS tunneling)
server.on('connect', (req, clientSocket, head) => {
  const [hostname, port] = req.url.split(':');
  const targetPort = parseInt(port) || 443;

  logger.info(`CONNECT: ${hostname}:${targetPort}`);

  const serverSocket = net.connect(targetPort, hostname, () => {
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  serverSocket.on('error', (err) => {
    logger.error(`CONNECT error: ${err.message}`);
    clientSocket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
    clientSocket.end();
  });

  clientSocket.on('error', (err) => {
    logger.error(`Client socket error: ${err.message}`);
    serverSocket.end();
  });
});

server.listen(PORT, () => {
  logger.info(`HTTP Proxy corriendo en puerto ${PORT}`);
  logger.info(`Soporta: HTTP proxy + CONNECT (HTTPS tunneling)`);
});

module.exports = server;
