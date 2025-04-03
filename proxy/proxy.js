const net = require('net');
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', ws => {
  const tcpClient = net.createConnection({ host: 'localhost', port: 8000 });

  tcpClient.on('data', data => {
    console.log("[Proxy] TCP -> WS:", data.toString());
    ws.send(data.toString()); // send to frontend
  });

  ws.on('message', message => {
    const cleaned = message.toString().trim();
    console.log("Proxy sending to TCP:", cleaned);
    tcpClient.write(cleaned + "\n");
  });

  ws.on('close', () => tcpClient.end());
});

console.log("WebSocket proxy running on ws://localhost:8080");
