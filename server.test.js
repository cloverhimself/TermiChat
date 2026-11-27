const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const net = require('node:net');
const readline = require('node:readline');
const path = require('node:path');
const once = require('node:events').once;
test('LAN messaging, colours, room isolation, private messages and replay', { timeout: 12000 }, async t => {
  const env = {...process.env, HOST:'127.0.0.1', PORT:'0', TERMICHAT_TLS:'0'};
  const child = spawn(process.execPath, [path.join(__dirname,'server.js')], {env});
  const sockets = [];
  t.after(() => { for (const s of sockets) s.destroy(); child.kill(); });
  const output = readline.createInterface({input:child.stdout});
  const [line] = await once(output,'line');
  const port = Number(line.match(/:(\d+)$/)?.[1]);
  // Port zero is reported by the actual bound address.
  assert.ok(port > 0);
  async function connect(name) {
    const s = net.createConnection({host:'127.0.0.1',port});
    sockets.push(s);
    s.setEncoding('utf8');
    const lines = [];
    const reader = readline.createInterface({input:s});
    reader.on('line',line => lines.push(line));
    async function wait(predicate) {
      for(let i=0;i<150;i++) {
        const found=lines.find(predicate);
        if(found) return found;
        await new Promise(r=>setTimeout(r,20));
      }
      assert.fail('Expected line not received: '+JSON.stringify(lines));
    }
    const send=value=>s.write(value+'\n');
    await wait(l=>l==='Enter your username:');
    send(name);
    await wait(l=>l==='Type /help for commands.');
    return {s,lines,wait,send};
  }
  const a=await connect('Alice');
  const b=await connect('Bob');
  await a.wait(l=>l==='@color Alice 34');
  await a.wait(l=>l==='@color Bob 33');
  a.send('hello 😂');
  const msg=await b.wait(l=>l.startsWith('@message ')&&l.includes('hello 😂'));
  b.send('/join dev');
  await b.wait(l=>l.includes('[#dev] Bob joined'));
  a.send('lobby only');
  await a.wait(l=>l.startsWith('@message ')&&l.includes('lobby only'));
  a.send('/dm Bob secret');
  await b.wait(l=>l==='[DM Alice -> Bob] secret');
  assert.ok(!b.lines.some(l=>l.includes('lobby only')));
  const c=await connect('Charlie');
  await c.wait(l=>l===msg);
  assert.ok(!c.lines.some(l=>l.includes('secret')));
});
