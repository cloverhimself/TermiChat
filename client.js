const net = require('node:net');
const readline = require('node:readline');

const host = process.argv[2] || '127.0.0.1';
const port = Number(process.argv[3] || 5050);
const socket = net.createConnection({ host, port });
const input = readline.createInterface({ input: process.stdin, output: process.stdout });
const messages = readline.createInterface({ input: socket, crlfDelay: Infinity });

socket.on('connect', () => console.log('Connected to TermiChat. Type /quit to leave.'));
messages.on('line', line => console.log(line));
input.on('line', line => {
  if (line === '/quit') {
    socket.end('/quit\n');
    input.close();
  } else if (!socket.destroyed && socket.writable) {
    socket.write(line + '\n');
  }
});
input.on('close', () => { if (!socket.destroyed && socket.writable) socket.end(); });
socket.on('error', error => { console.error('Connection error: ' + error.message); process.exitCode = 1; });
socket.on('close', () => { messages.close(); input.close(); });
