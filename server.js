const net = require('node:net');
const readline = require('node:readline');

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 5050);
const clients = new Map();

function broadcast(message) {
  for (const socket of clients.keys()) {
    if (!socket.destroyed) socket.write(message + '\n');
  }
}

const server = net.createServer(socket => {
  socket.setEncoding('utf8');
  const lines = readline.createInterface({ input: socket, crlfDelay: Infinity });
  socket.write('Enter your username:\n');
  lines.on('line', line => {
    const value = line.trim();
    if (!value) return;
    if (!clients.has(socket)) {
      if (!/^[a-zA-Z0-9_-]{1,24}$/.test(value) || [...clients.values()].some(n => n.toLowerCase() === value.toLowerCase())) {
        socket.write('Choose a unique username (1-24 letters, numbers, _ or -):\n');
        return;
      }
      clients.set(socket, value);
      broadcast(value + ' joined the chat.');
      return;
    }
    if (value === '/quit') return socket.end();
    if (value.length > 2000 || /[\x00-\x1f\x7f-\x9f]/.test(value)) {
      socket.write('Invalid message. Use plain text up to 2000 characters.\n');
      return;
    }
    broadcast(clients.get(socket) + ': ' + value);
  });
  socket.on('error', () => socket.destroy());
  socket.on('close', () => {
    lines.close();
    const name = clients.get(socket);
    clients.delete(socket);
    if (name) broadcast(name + ' left the chat.');
  });
});

server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, host, () => console.log('TermiChat listening on ' + host + ':' + port));
