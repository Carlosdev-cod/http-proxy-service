const net = require('net');
const { WebSocket } = require('ws');

const PROXY_HOST = 'proxy.p.jo3.org';
const PROXY_PORT = 443;
const LOCAL_PORT = 1080;

const server = net.createServer((clientSocket) => {
  console.log('[SOCKS5] Nueva conexión');

  clientSocket.once('data', (data) => {
    // SOCKS5 handshake - responder con "no auth required"
    if (data[0] === 0x05) {
      clientSocket.write(Buffer.from([0x05, 0x00]));
    }
  });

  clientSocket.once('data', (data) => {
    if (data[0] !== 0x05) return;

    const cmd = data[1];
    const atyp = data[3];

    let targetHost, targetPort;

    if (atyp === 0x01) {
      // IPv4
      targetHost = `${data[4]}.${data[5]}.${data[6]}.${data[7]}`;
      targetPort = data.readUInt16BE(8);
    } else if (atyp === 0x03) {
      // Domain
      const domainLen = data[4];
      targetHost = data.slice(5, 5 + domainLen).toString();
      targetPort = data.readUInt16BE(5 + domainLen);
    } else if (atyp === 0x04) {
      // IPv6
      targetHost = data.slice(4, 20).toString('hex').match(/.{4}/g).join(':');
      targetPort = data.readUInt16BE(20);
    }

    console.log(`[SOCKS5] Conectando a ${targetHost}:${targetPort}`);

    // Conectar por WebSocket al proxy
    const ws = new WebSocket(`wss://${PROXY_HOST}:${PROXY_PORT}`);

    ws.on('open', () => {
      ws.send(`${targetHost}:${targetPort}`);
    });

    ws.on('message', (msg) => {
      const str = msg.toString();

      if (str === 'CONNECTED') {
        // Responder SOCKS5 success
        const response = Buffer.alloc(10);
        response[0] = 0x05;
        response[1] = 0x00;
        response[2] = 0x00;
        response[3] = 0x01;
        clientSocket.write(response);

        console.log(`[SOCKS5] Conectado a ${targetHost}:${targetPort}`);
      } else if (str.startsWith('ERROR:')) {
        console.error(`[SOCKS5] Error: ${str}`);
        const response = Buffer.alloc(10);
        response[0] = 0x05;
        response[1] = 0x01;
        clientSocket.write(response);
      } else {
        // Datos del destino hacia el cliente
        clientSocket.write(msg);
      }
    });

    ws.on('close', () => {
      clientSocket.end();
    });

    ws.on('error', (err) => {
      console.error(`[WS] Error: ${err.message}`);
      clientSocket.end();
    });

    // Datos del cliente hacia el destino
    clientSocket.on('data', (chunk) => {
      if (ws.readyState === 1) {
        ws.send(chunk);
      }
    });

    clientSocket.on('close', () => {
      ws.close();
    });
  });
});

server.listen(LOCAL_PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║      PROXY SOCKS5 - WebSocket Tunnel     ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  Local:  socks5://127.0.0.1:${LOCAL_PORT}       ║`);
  console.log(`║  Via:    wss://${PROXY_HOST}  ║`);
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log('Configura tu app para usar:');
  console.log(`  Host: 127.0.0.1`);
  console.log(`  Port: ${LOCAL_PORT}`);
  console.log(`  Type: SOCKS5`);
  console.log('');
});
