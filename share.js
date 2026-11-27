const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawnSync } = require('node:child_process');
const { encode, fingerprint } = require('./invite');
const host = process.argv[2];
if (!host || !(net.isIP(host) || /^[a-z0-9][a-z0-9.-]{0,252}$/i.test(host))) {
  console.error('Usage: klvrchat share REACHABLE_IP_OR_HOSTNAME [PORT]');
  process.exit(1);
}
const port = Number(process.argv[3] || 5050);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port.');
const dir = fs.mkdtempSync(path.join(os.tmpdir(),'klvrchat-'));
const key = path.join(dir,'key.pem');
const cert = path.join(dir,'cert.pem');
process.on('exit',()=>fs.rmSync(dir,{recursive:true,force:true}));
const result = spawnSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=KLVRChat'],{stdio:'ignore'});
if (result.status !== 0) {
  console.error('OpenSSL is required for hosting an invite. Install OpenSSL and retry.');
  process.exit(1);
}
const token=crypto.randomBytes(32).toString('hex');
const pin=fingerprint(new crypto.X509Certificate(fs.readFileSync(cert)));
Object.assign(process.env,{HOST:'0.0.0.0',PORT:String(port),TERMICHAT_TLS:'1',TERMICHAT_TOKEN:token,TERMICHAT_KEY:key,TERMICHAT_CERT:cert});
process.env.TERMICHAT_INVITE=encode(host,port,token,pin);
require('./server');
