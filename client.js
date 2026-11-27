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
    console.log(lines.map(line => line.replace(/^(\S+ )(.*)$/, (_, timestamp, message) => timestamp + formatMessage(message))).join('\n'));
    console.log('--- End of history ---\n');
  } catch (error) {
    console.error('Could not read history: ' + error.message);
  }
}
const socket = net.createConnection({ host, port });
const input = readline.createInterface({ input: process.stdin, output: process.stdout });
socket.setEncoding('utf8');
const messages = readline.createInterface({ input: socket, crlfDelay: Infinity });

socket.on('connect', () => console.log('Connected to TermiChat. Type /history for local history or /quit to leave.'));
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
  const assignment = line.match(/^@color ([a-zA-Z0-9_-]{1,24}) (\d{2})$/);
  if (assignment && palette.includes(Number(assignment[2]))) {
    colors.set(assignment[1].toLowerCase(), Number(assignment[2]));
    return;
  }
  console.log(formatMessage(line));
  if (/^(?:\[#[\w-]+\] [\w-]+(?:: | (?:joined|left) the chat\.$)|\[DM [\w-]+ -> [\w-]+\] |[\w-]+(?:: | (?:joined|left) the chat\.$))/.test(line)) saveMessage(line);
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
