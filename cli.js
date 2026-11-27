#!/usr/bin/env node
const { spawn } = require('node:child_process');
const readline = require('node:readline');
const path = require('node:path');
const settings = require('./settings');
async function setup() {
  const current = settings.load();
  const input = readline.createInterface({input:process.stdin,output:process.stdout});
  const ask = prompt => new Promise(resolve=>input.question(prompt,resolve));
  try {
    const username=(await ask('Username ['+(current.username||'ask each time')+']: ')).trim()||current.username;
    const method=(await ask('Network (auto/lan/tailscale/public/manual) ['+current.method+']: ')).trim()||current.method;
    const port=Number((await ask('Port ['+current.port+']: ')).trim()||current.port);
    const address=method==='manual'?(await ask('Reachable address ['+current.address+']: ')).trim()||current.address:'';
    settings.save({username,method,port,address});
    console.log('Settings saved.');
  } finally {input.close();}
}
async function run(command, args = []) {
  if(command==='setup') return setup();
  if(command==='host' && args.includes('--online')) {
    const config=settings.load();
    const result=await settings.resolveAddress(config);
    console.log('Detected '+result.method+' address: '+result.host);
    if(result.method==='lan') console.log('LAN only: for remote access configure Tailscale or public port forwarding.');
    if(result.method==='public'||result.method==='manual') console.log('External reachability is not verified. Ensure port forwarding and firewall access.');
    if(result.method==='tailscale') console.log('Guests need access to your Tailscale network.');
    command='share';args=[result.host,String(config.port)];
  }
  const env = { ...process.env };
  const config = settings.load();
  if (config.username) env.KLVRCHAT_USERNAME = config.username;
  if (command === 'host' || command === 'local') env.PORT = String(config.port);
  if (command === 'chat' && !args.length) args = ['127.0.0.1', String(config.port)];
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
  console.log('klvrchat [host [--online]|setup|local|discover|chat HOST PORT [--tls]|online|share HOST PORT|join INVITE]');
} else if (command) run(command, args).catch(error=>{console.error(error.message);process.exitCode=1;});
else {
  console.log('\n  K L V R C H A T\n  1. Host LAN chat\n  2. Discover LAN servers\n  3. Connect locally\n  4. Connect to online server (TLS)\n  5. Exit\n  6. Host online with invite\n  7. Join with invite\n  8. Settings\n');
  const input = readline.createInterface({ input: process.stdin, output: process.stdout });
  input.question('Select: ', answer => {
    const launch=(command,args)=>run(command,args).catch(error=>{console.error(error.message);process.exitCode=1;});
    if (answer === '6' || answer === '8') {input.close();return launch(answer==='6'?'host':'setup',answer==='6'?['--online']:[]);}
    if (answer === '7') return input.question('Private invite: ', value => { input.close(); launch('join', [value.trim()]); });
    if (answer === '4') return input.question('Server hostname: ', host => {
      input.question('Port [5050]: ', port => { input.close(); launch('chat', [host.trim(), port.trim() || '5050', '--tls']); });
    });
    input.close();
    if (answer === '1') launch('host');
    else if (answer === '2') launch('discover');
    else if (answer === '3') launch('chat');
    else if (answer !== '5') console.error('Invalid selection.');
  });
}
