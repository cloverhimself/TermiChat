const net = require('node:net');
const readline = require('node:readline');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const host = process.argv[2] || '127.0.0.1';
const port = Number(process.argv[3] || 5050);
const historyDir = path.join(os.homedir(), '.termichat');
const historyFile = path.join(historyDir, Buffer.from(host + ':' + port).toString('hex') + '.log');
let historyEnabled = true;
try {
  fs.mkdirSync(historyDir, { recursive: true, mode: 0o700 });
} catch (error) {
  historyEnabled = false;
  console.error('History unavailable: ' + error.message);
}
function saveMessage(line) {
  if (!historyEnabled) return;
  try {
    fs.appendFileSync(historyFile, new Date().toISOString() + ' ' + line + '\n', { encoding: 'utf8', mode: 0o600 });
  } catch (error) {
    historyEnabled = false;
    console.error('History unavailable: ' + error.message);
  }
}
function showHistory() {
  try {
    if (!historyEnabled || !fs.existsSync(historyFile)) return console.log('No local history yet.');
    const lines = fs.readFileSync(historyFile, 'utf8').trimEnd().split('\n').slice(-20);
    console.log('\n--- Local history (last 20 entries) ---');
    console.log(lines.join('\n'));
    console.log('--- End of history ---\n');
  } catch (error) {
    console.error('Could not read history: ' + error.message);
  }
}
const socket = net.createConnection({ host, port });
const input = readline.createInterface({ input: process.stdin, output: process.stdout });
const messages = readline.createInterface({ input: socket, crlfDelay: Infinity });

socket.on('connect', () => console.log('Connected to TermiChat. Type /history for local history or /quit to leave.'));
messages.on('line', line => {
  console.log(line);
  // Only chat messages and presence notices belong in the history.
  if (/^[a-zA-Z0-9_-]{1,24}(?:: | (?:joined|left) the chat\.$)/.test(line)) saveMessage(line);
});
input.on('line', line => {
  if (line === '/history') return showHistory();
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
