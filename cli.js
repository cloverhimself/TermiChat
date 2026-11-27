#!/usr/bin/env node
const { spawn } = require('node:child_process');
const readline = require('node:readline');
const path = require('node:path');
function run(command, args = []) {
  const env = { ...process.env };
  if (command === 'join') {
    try { require('./invite').decode(args[0]); } catch { console.error('Invalid invite.'); process.exitCode = 1; return; }
    env.TERMICHAT_INVITE = args.shift(); command = 'chat';
  }
  const files = { share: 'share.js', host: 'server.js', local: 'server.js', online: 'server.js', chat: 'client.js', discover: 'discovery.js' };
  if (!files[command]) { console.error('Unknown command. Run klvrchat --help.'); process.exitCode = 1; return; }
  if (command === 'host' || command === 'online') env.HOST = '0.0.0.0';
  if (command === 'online') env.TERMICHAT_TLS = '1';
  const child = spawn(process.execPath, [path.join(__dirname, files[command]), ...args], { env, stdio: 'inherit' });
  child.on('error', error => { console.error(error.message); process.exitCode = 1; });
  child.on('exit', code => { process.exitCode = code ?? 1; });
}
const [command, ...args] = process.argv.slice(2);
if (command === '--help' || command === '-h') {
  console.log('klvrchat [host|local|discover|chat HOST PORT [--tls]|online|share HOST PORT|join INVITE]');
} else if (command) run(command, args);
else {
  console.log('\n  K L V R C H A T\n  1. Host LAN chat\n  2. Discover LAN servers\n  3. Connect locally\n  4. Connect to online server (TLS)\n  5. Exit\n  6. Host online with invite\n  7. Join with invite\n');
  const input = readline.createInterface({ input: process.stdin, output: process.stdout });
  input.question('Select: ', answer => {
    if (answer === '6' || answer === '7') return input.question(answer === '6' ? 'Reachable IP or hostname: ' : 'Private invite: ', value => { input.close(); run(answer === '6' ? 'share' : 'join', [value.trim()]); });
    if (answer === '4') return input.question('Server hostname: ', host => {
      input.question('Port [5050]: ', port => { input.close(); run('chat', [host.trim(), port.trim() || '5050', '--tls']); });
    });
    input.close();
    if (answer === '1') run('host');
    else if (answer === '2') run('discover');
    else if (answer === '3') run('chat');
    else if (answer !== '5') console.error('Invalid selection.');
  });
}
