const http = require('http');
const https = require('https');
const net = require('net');
const { URL } = require('url');

const PORT = process.env.PORT || 8080;

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
      version: '3.1.0',
      status: 'running'
    }));
    return;
  }

  const targetUrl = req.url;
  console.log(`[HTTP] ${req.method} ${targetUrl}`);

  try {
    const parsedUrl = new URL(targetUrl);
    const isHttps = parsedUrl.protocol === 'https:';
    const targetPort = parsedUrl.port ? parseInt(parsedUrl.port) : (isHttps ? 443 : 80);

    const options = {
      hostname: parsedUrl.hostname,
      port: targetPort,
      path: parsedUrl.pathname + parsedUrl.search,
      method: req.method,
      headers: { ...req.headers, host: parsedUrl.hostname }
    };

    const transport = isHttps ? https : http;
    const proxyReq = transport.request(options, (proxyRes) => {
      const headers = { ...proxyRes.headers };
      delete headers['transfer-encoding'];
      res.writeHead(proxyRes.statusCode, headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error(`[ERROR] ${err.message}`);
      if (!res.headersSent) {
        res.writeHead(502);
        res.end('Bad Gateway: ' + err.message);
      }
    });

    req.pipe(proxyReq);
  } catch (err) {
    console.error(`[PARSE ERROR] ${err.message}`);
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

  clientSocket.on('error', () => serverSocket.end());
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Proxy en puerto ${PORT}`);
});
