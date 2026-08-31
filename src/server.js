const http = require('http');
const net = require('net');

const PORT = process.env.PORT || 3000;

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
      version: '3.0.0',
      status: 'running'
    }));
    return;
  }

  console.log(`[HTTP] ${req.method} ${req.url}`);

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
      console.error(`[ERROR] ${err.message}`);
      res.writeHead(502);
      res.end('Bad Gateway');
    });

    req.pipe(proxyReq);
  } catch (err) {
    res.writeHead(400);
    res.end('Bad Request');
  }
});

server.on('connect', (req, clientSocket, head) => {
  const [hostname, port] = req.url.split(':');
  const targetPort = parseInt(port) || 443;

  console.log(`[CONNECT] ${hostname}:${targetPort}`);

  const serverSocket = net.connect(targetPort, hostname, () => {
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  serverSocket.on('error', (err) => {
    console.error(`[CONNECT ERROR] ${err.message}`);
    clientSocket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
    clientSocket.end();
  });

  clientSocket.on('error', (err) => {
    console.error(`[CLIENT ERROR] ${err.message}`);
    serverSocket.end();
  });
});

server.listen(PORT, () => {
  console.log(`Proxy corriendo en puerto ${PORT}`);
  console.log(`HTTP + CONNECT (HTTPS tunneling) soportado`);
});

module.exports = server;
