const net = require('node:net');
const tls = require('node:tls');
const fs = require('node:fs');
const crypto = require('node:crypto');
const secure = process.env.TERMICHAT_TLS === '1';
const secret = process.env.TERMICHAT_TOKEN;
if (secure && (!secret || secret.length < 24 || secret.length > 256 || /\s/.test(secret))) throw new Error('Online mode requires TERMICHAT_TOKEN of at least 24 characters.');
const roomHistory = new Map();
function matchesToken(value) {
  const digest = text => crypto.createHash('sha256').update(text).digest();
  return crypto.timingSafeEqual(digest(value), digest(secret));
}
function remember(room, line) {
  if (!roomHistory.has(room)) {
    if (roomHistory.size >= 100) roomHistory.delete(roomHistory.keys().next().value);
    roomHistory.set(room, []);
  }
  const entries = roomHistory.get(room);
  entries.push({ id: crypto.randomUUID(), line, time: new Date().toISOString() });
  if (entries.length > 100) entries.shift();
  return entries[entries.length - 1];
}
function replay(socket, room) {
  for (const entry of roomHistory.get(room) || []) send(socket, '@message ' + JSON.stringify(entry));
}
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 5050);
const clients = new Map();
const palette = [34, 33, 31, 95, 32, 36, 35, 37, 94, 93, 91, 92, 96, 90];
function assignColor() {
  const used = new Set([...clients.values()].map(u => u.color));
  return palette.find(color => !used.has(color)) ?? palette[clients.size % palette.length];
}
function announceColors(socket) {
  for (const user of clients.values()) send(socket, '@color ' + user.name + ' ' + user.color);
}
const validName = /^[a-zA-Z0-9_-]{1,24}$/;
function send(socket, message) {
  if (!socket.destroyed && socket.writable) {
    if (socket.writableLength > 262144) return socket.destroy();
    socket.write(message + '\n');
  }
}
function broadcast(room, message) {
  for (const [socket, user] of clients) if (user.room === room) send(socket, message);
}
function handleConnection(socket) {
  if (server.connectionsCount >= 100) return socket.destroy();
  server.connectionsCount = (server.connectionsCount || 0) + 1;
  let authenticated = !secure;
  const authTimer = setTimeout(() => { if (!clients.has(socket)) socket.destroy(); }, 30000);
  let pending = '';
  socket.setEncoding('utf8');
  send(socket, secure ? '@auth' : 'Enter your username:');
  function onLine(line) {
    const value = line.trim();
    if (!value) return;
    if (!authenticated) {
      if (!matchesToken(value)) { send(socket, 'Access denied.'); return socket.end(); }
      authenticated = true;
      return send(socket, 'Enter your username:');
    }
    if (value === '/quit') return socket.end();
    if (value.length > 2000 || /[\x00-\x1f\x7f-\x9f]/.test(value)) {
      return send(socket, 'Invalid message. Use plain text up to 2000 characters.');
    }
    const user = clients.get(socket);
    if (!user) {
      if (!validName.test(value) || [...clients.values()].some(u => u.name.toLowerCase() === value.toLowerCase())) {
        return send(socket, 'Choose a unique username (1-24 letters, numbers, _ or -):');
      }
      clients.set(socket, { name: value, room: 'lobby', color: assignColor() });
      clearTimeout(authTimer);
      announceColors(socket);
      replay(socket, 'lobby');
      for (const other of clients.keys()) if (other !== socket) send(other, '@color ' + value + ' ' + clients.get(socket).color);
      broadcast('lobby', '[#lobby] ' + value + ' joined the chat.');
      return send(socket, 'Type /help for commands.');
    }
    const [command, ...args] = value.split(/\s+/);
    if (command === '/help') return send(socket, '/join ROOM | /rooms | /users | /dm USER MESSAGE | /history | /clear | /quit');
    if (command === '/rooms') return send(socket, 'Rooms: ' + [...new Set(['lobby', ...[...clients.values()].map(u => u.room)])].join(', '));
    if (command === '/users') return send(socket, 'Online in #' + user.room + ': ' + [...clients.values()].filter(u => u.room === user.room).map(u => u.name).join(', '));
    if (command === '/join') {
      if (args.length !== 1 || !validName.test(args[0])) return send(socket, 'Usage: /join ROOM (letters, numbers, _ or -)');
      const room = args[0].toLowerCase();
      if (room === user.room) return send(socket, 'Already in #' + room);
      broadcast(user.room, '[#' + user.room + '] ' + user.name + ' left the chat.');
      user.room = room;
      replay(socket, room);
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
    const entry = remember(user.room, '[#' + user.room + '] ' + user.name + ': ' + value);
    broadcast(user.room, '@message ' + JSON.stringify(entry));
  }
  socket.on('data', chunk => {
    pending += chunk;
    let end;
    while ((end = pending.indexOf('\n')) !== -1) {
      if (end > 4096) return socket.destroy();
      const line = pending.slice(0, end);
      pending = pending.slice(end + 1);
      onLine(line);
      if (socket.destroyed || !socket.writable) return;
    }
    if (pending.length > 4096) socket.destroy();
  });
  socket.on('error', () => socket.destroy());
  socket.on('close', () => {
    clearTimeout(authTimer);
    server.connectionsCount--;
    const user = clients.get(socket);
    clients.delete(socket);
    if (user) broadcast(user.room, '[#' + user.room + '] ' + user.name + ' left the chat.');
  });
 }
const server = secure ? tls.createServer({
  key: fs.readFileSync(process.env.TERMICHAT_KEY),
  cert: fs.readFileSync(process.env.TERMICHAT_CERT),
  minVersion: 'TLSv1.2',
  handshakeTimeout: 10000
}, handleConnection) : net.createServer(handleConnection);
server.maxConnections = 100;
server.on('tlsClientError', () => {});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, host, () => {
  console.log('TermiChat listening on ' + host + ':' + server.address().port);
  if (!secure && host === '0.0.0.0') {
    const { advertise } = require('./discovery');
    const discovery = advertise(server.address().port);
    server.on('close', () => discovery.close());
  }
});
