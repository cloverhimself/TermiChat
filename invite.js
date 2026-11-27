const crypto = require('node:crypto');
const net = require('node:net');
function encode(host, port, token, fingerprint) {
  return 'TC1.' + Buffer.from(JSON.stringify({host,port,token,fingerprint})).toString('base64url');
}
function decode(code) {
  if (typeof code !== 'string' || !code.startsWith('TC1.') || code.length > 2048) throw new Error('Invalid invite.');
  const data = JSON.parse(Buffer.from(code.slice(4),'base64url').toString());
  if (!data || typeof data.host !== 'string' || !(net.isIP(data.host) || /^[a-z0-9][a-z0-9.-]{0,252}$/i.test(data.host)) || !Number.isInteger(data.port) || data.port < 1 || data.port > 65535 || !/^[a-f0-9]{64}$/.test(data.token) || !/^[a-f0-9]{64}$/.test(data.fingerprint)) throw new Error('Invalid invite.');
  return data;
}
function fingerprint(cert) { return crypto.createHash('sha256').update(cert.raw).digest('hex'); }
module.exports = {encode,decode,fingerprint};
