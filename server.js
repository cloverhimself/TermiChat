const net = require('node:net');
const readline = require('node:readline');
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 5050);
const clients = new Map();
const validName = /^[a-zA-Z0-9_-]{1,24}$/;
function send(socket, message) {
  if (!socket.destroyed && socket.writable) socket.write(message + '\n');
}
function broadcast(room, message) {
  for (const [socket, user] of clients) if (user.room === room) send(socket, message);
}
const server = net.createServer(socket => {
  socket.setEncoding('utf8');
  const lines = readline.createInterface({ input: socket, crlfDelay: Infinity });
  send(socket, 'Enter your username:');
  lines.on('line', line => {
    const value = line.trim();
    if (!value) return;
    if (value === '/quit') return socket.end();
    if (value.length > 2000 || /[\x00-\x1f\x7f-\x9f]/.test(value)) {
      return send(socket, 'Invalid message. Use plain text up to 2000 characters.');
    }
    const user = clients.get(socket);
    if (!user) {
      if (!validName.test(value) || [...clients.values()].some(u => u.name.toLowerCase() === value.toLowerCase())) {
        return send(socket, 'Choose a unique username (1-24 letters, numbers, _ or -):');
      }
      clients.set(socket, { name: value, room: 'lobby' });
      broadcast('lobby', '[#lobby] ' + value + ' joined the chat.');
      return send(socket, 'Type /help for commands.');
    }
    const [command, ...args] = value.split(/\s+/);
    if (command === '/help') return send(socket, '/join ROOM | /rooms | /users | /dm USER MESSAGE | /history | /quit');
    if (command === '/rooms') return send(socket, 'Rooms: ' + [...new Set(['lobby', ...[...clients.values()].map(u => u.room)])].join(', '));
    if (command === '/users') return send(socket, 'Online in #' + user.room + ': ' + [...clients.values()].filter(u => u.room === user.room).map(u => u.name).join(', '));
    if (command === '/join') {
      if (args.length !== 1 || !validName.test(args[0])) return send(socket, 'Usage: /join ROOM (letters, numbers, _ or -)');
      const room = args[0].toLowerCase();
      if (room === user.room) return send(socket, 'Already in #' + room);
      broadcast(user.room, '[#' + user.room + '] ' + user.name + ' left the chat.');
      user.room = room;
      return broadcast(room, '[#' + room + '] ' + user.name + ' joined the chat.');
    }
    if (command === '/dm') {
      const match = value.match(/^\/dm\s+(\S+)\s+(.+)$/);
      if (!match) return send(socket, 'Usage: /dm USER MESSAGE');
      const target = [...clients].find(([, u]) => u.name.toLowerCase() === match[1].toLowerCase());
      if (!target) return send(socket, 'User is not online.');
      const message = '[DM ' + user.name + ' -> ' + target[1].name + '] ' + match[2];
      send(socket, message);
      if (target[0] !== socket) send(target[0], message);
      return;
    }
    if (value.startsWith('/')) return send(socket, 'Unknown command. Type /help.');
    broadcast(user.room, '[#' + user.room + '] ' + user.name + ': ' + value);
  });
  socket.on('error', () => socket.destroy());
  socket.on('close', () => {
    lines.close();
    const user = clients.get(socket);
    clients.delete(socket);
    if (user) broadcast(user.room, '[#' + user.room + '] ' + user.name + ' left the chat.');
  });
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, host, () => console.log('TermiChat listening on ' + host + ':' + port));
