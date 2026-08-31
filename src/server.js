require('dotenv').config();
const http = require('http');
const net = require('net');
const { WebSocketServer } = require('ws');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;

// Servidor HTTP base
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', uptime: process.uptime() }));
    return;
  }

  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      service: 'HTTP Proxy Service',
      version: '2.0.0',
      status: 'running',
      mode: 'websocket-tunnel'
    }));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

// WebSocket para tunelizar conexiones
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  logger.info('WebSocket client conectado');

  let targetSocket = null;
  let connected = false;

  ws.on('message', (data) => {
    const msg = data.toString();

    // Primer mensaje: host:port del destino
    if (!connected) {
      const [host, port] = msg.split(':');
      const targetPort = parseInt(port) || 443;

      logger.info(`Tunnel a ${host}:${targetPort}`);

      targetSocket = net.connect(targetPort, host, () => {
        connected = true;
        ws.send('CONNECTED');
        logger.info(`Conectado a ${host}:${targetPort}`);
      });

      targetSocket.on('data', (chunk) => {
        if (ws.readyState === 1) {
          ws.send(chunk);
        }
      });

      targetSocket.on('error', (err) => {
        logger.error(`Target error: ${err.message}`);
        ws.send('ERROR:' + err.message);
        ws.close();
      });

      targetSocket.on('close', () => {
        ws.close();
      });
    } else {
      // Datos para enviar al destino
      if (targetSocket && !targetSocket.destroyed) {
        targetSocket.write(data);
      }
    }
  });

  ws.on('close', () => {
    if (targetSocket && !targetSocket.destroyed) {
      targetSocket.destroy();
    }
    logger.info('WebSocket client desconectado');
  });

  ws.on('error', (err) => {
    logger.error(`WebSocket error: ${err.message}`);
    if (targetSocket && !targetSocket.destroyed) {
      targetSocket.destroy();
    }
  });
});

server.listen(PORT, () => {
  logger.info(`Proxy corriendo en puerto ${PORT}`);
  logger.info(`Modo: WebSocket tunnel`);
});

module.exports = server;
