const net = require('node:net');
const tls = require('node:tls');
const readline = require('node:readline');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const args = process.argv.slice(2);
const secure = args.includes('--tls');
const positional = args.filter(arg => arg !== '--tls');
const host = positional[0] || '127.0.0.1';
const port = Number(positional[1] || 5050);
const token = process.env.TERMICHAT_TOKEN;
if (secure && !token) { console.error('Set TERMICHAT_TOKEN before connecting.'); process.exit(1); }
const historyDir = path.join(os.homedir(), '.termichat');
const historyFile = path.join(historyDir, Buffer.from((secure ? 'tls:' : '') + host + ':' + port).toString('hex') + '.log');
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
    console.log(lines.map(line => line.replace(/^(\S+ )(.*)$/, (_, timestamp, message) => timestamp + formatMessage(message))).join('\n'));
    console.log('--- End of history ---\n');
  } catch (error) {
    console.error('Could not read history: ' + error.message);
  }
}
const seenFile = historyFile + '.ids';
const seen = new Set();
try {
  if (fs.existsSync(seenFile)) for (const id of fs.readFileSync(seenFile, 'utf8').split('\n')) if (id) seen.add(id);
} catch {}
const options = { host, port };
if (secure) {
  options.servername = host;
  if (process.env.TERMICHAT_CA) options.ca = fs.readFileSync(process.env.TERMICHAT_CA);
}
const socket = secure ? tls.connect(options) : net.createConnection(options);
const input = readline.createInterface({ input: process.stdin, output: process.stdout });
socket.setEncoding('utf8');
const messages = readline.createInterface({ input: socket, crlfDelay: Infinity });

socket.on(secure ? 'secureConnect' : 'connect', () => {
  console.log('\n  TERMICHAT  |  ' + (secure ? 'ONLINE / TLS' : 'LOCAL / LAN'));
  console.log('  ' + host + ':' + port + '  |  /help  /history  /quit\n');
});
const useColor = process.stdout.isTTY && !('NO_COLOR' in process.env) && process.env.TERM !== 'dumb';
const palette = [34, 33, 31, 95, 32, 36, 35, 37, 94, 93, 91, 92, 96, 90];
const colors = new Map();
function colorName(name) {
  if (!useColor) return name;
  const color = colors.get(name.toLowerCase());
  return color ? '\x1b[' + color + 'm' + name + '\x1b[0m' : name;
}
function formatMessage(line) {
  const room = line.match(/^(\[#[\w-]+\] )([\w-]+)(: | (?:joined|left) the chat\.$)(.*)$/u);
  if (room) return room[1] + colorName(room[2]) + room[3] + room[4];
  const dm = line.match(/^\[DM ([\w-]+) -> ([\w-]+)\] (.*)$/u);
  if (dm) return '[DM ' + colorName(dm[1]) + ' -> ' + colorName(dm[2]) + '] ' + dm[3];
  return line;
}
messages.on('line', line => {
  if (line === '@auth') {
    if (!secure) { console.error('Refusing to send token over plaintext.'); return socket.destroy(); }
    return socket.write(token + '\n');
  }
  if (line.startsWith('@message ')) {
    try {
      const entry = JSON.parse(line.slice(9));
      if (!/^[a-f0-9-]{36}$/.test(entry.id) || typeof entry.line !== 'string' || /[\x00-\x1f\x7f-\x9f]/.test(entry.line)) return;
      if (seen.has(entry.id)) return;
      seen.add(entry.id);
      console.log('[' + new Date(entry.time).toLocaleTimeString() + '] ' + formatMessage(entry.line));
      saveMessage(entry.line);
      if (historyEnabled) fs.appendFileSync(seenFile, entry.id + '\n', { mode: 0o600 });
    } catch (error) { console.error('Message/history error: ' + error.message); }
    return;
  }
  const assignment = line.match(/^@color ([a-zA-Z0-9_-]{1,24}) (\d{2})$/);
  if (assignment && palette.includes(Number(assignment[2]))) {
    colors.set(assignment[1].toLowerCase(), Number(assignment[2]));
    return;
  }
  console.log(formatMessage(line.replace(/[\x00-\x1f\x7f-\x9f]/g, '')));
  if (/^(?:\[#[\w-]+\] [\w-]+(?:: | (?:joined|left) the chat\.$)|\[DM [\w-]+ -> [\w-]+\] |[\w-]+(?:: | (?:joined|left) the chat\.$))/.test(line)) saveMessage(line);
});
input.on('line', line => {
  if (line === '/history') return showHistory();
  if (line === '/clear') return console.clear();
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
