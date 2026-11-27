const dgram = require('node:dgram');
const os = require('node:os');
const readline = require('node:readline');
const { spawn } = require('node:child_process');
const path = require('node:path');
const DISCOVERY_PORT = 5051;
const PROBE = 'TERMICHAT_DISCOVER_V1';
function advertise(port) {
  const socket = dgram.createSocket('udp4');
  socket.on('error', error => {
    console.error('LAN discovery unavailable: ' + error.message);
    try { socket.close(); } catch {}
  });
  socket.on('message', (message, peer) => {
    if (message.toString() !== PROBE) return;
    const reply = Buffer.from(JSON.stringify({ service: 'termichat-v1', port }));
    socket.send(reply, peer.port, peer.address, () => {});
  });
  socket.bind(DISCOVERY_PORT, '0.0.0.0');
  return { close() { try { socket.close(); } catch {} } };
}
function discover() {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');
    const found = new Map();
    let timer;
    socket.on('error', error => {
      clearTimeout(timer);
      try { socket.close(); } catch {}
      reject(error);
    });
    socket.on('message', (message, peer) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.service !== 'termichat-v1' || !Number.isInteger(data.port) || data.port < 1 || data.port > 65535) return;
        found.set(peer.address + ':' + data.port, { host: peer.address, port: data.port });
      } catch {}
    });
    socket.bind(0, () => {
      socket.setBroadcast(true);
      const destinations = new Set(['255.255.255.255', '127.0.0.1']);
      for (const addresses of Object.values(os.networkInterfaces())) {
        for (const entry of addresses || []) {
          if (entry.family !== 'IPv4' || entry.internal) continue;
          const ip = entry.address.split('.').map(Number);
          const mask = entry.netmask.split('.').map(Number);
          destinations.add(ip.map((n, i) => (n | (~mask[i] & 255))).join('.'));
        }
      }
      for (const address of destinations) socket.send(PROBE, DISCOVERY_PORT, address, () => {});
      timer = setTimeout(() => { socket.close(); resolve([...found.values()]); }, 1500);
    });
  });
}
async function main() {
  console.log('Looking for TermiChat servers on your local network...');
  const servers = await discover();
  if (!servers.length) {
    console.log('No servers found. Start a LAN server or connect manually: npm run chat -- HOST_IP 5050');
    return;
  }
  servers.forEach((server, i) => console.log((i + 1) + '. ' + server.host + ':' + server.port));
  const input = readline.createInterface({ input: process.stdin, output: process.stdout });
  input.question('Select a server (number, or q to quit): ', answer => {
    input.close();
    if (answer.trim().toLowerCase() === 'q') return;
    const selected = servers[Number(answer) - 1];
    if (!selected) { console.error('Invalid selection. Run discovery again.'); return; }
    const child = spawn(process.execPath, [path.join(__dirname, 'client.js'), selected.host, String(selected.port)], { stdio: 'inherit' });
    child.on('error', error => { console.error(error.message); process.exitCode = 1; });
    child.on('exit', code => { process.exitCode = code ?? 1; });
  });
}
module.exports = { advertise, discover };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
