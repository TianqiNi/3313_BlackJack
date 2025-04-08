const net = require('net');
const WebSocket = require('ws');
const axios = require('axios');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', async (ws, req) => {
  const ip = req.socket.remoteAddress.replace(/^::ffff:/, '');
  console.log(`[Proxy] New connection from IP: ${ip}`);

  try {
    const response = await axios.get(`http://ip-api.com/json/${ip}`);
    const geo = response.data;
    console.log(`[Proxy] Location: ${geo.city}, ${geo.country} (${geo.lat}, ${geo.lon})`);
  } catch (err) {
    console.error("[Proxy] Failed to fetch geo info:", err.message);
  }

  const tcpClient = net.createConnection({ host: 'localhost', port: 8000 });

  tcpClient.on('data', data => {
    console.log("[Proxy] TCP -> WS:", data.toString());
    ws.send(data.toString());
  });

  ws.on('message', message => {
    const cleaned = message.toString().trim();
    console.log("[Proxy] WS -> TCP:", cleaned);
    tcpClient.write(cleaned + "\n");
  });

  ws.on('close', () => tcpClient.end());
});

console.log("WebSocket proxy running on ws://localhost:8080");
