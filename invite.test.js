const {test}=require('node:test');
const assert=require('node:assert/strict');
const {encode,decode}=require('./invite');
test('invite round trip and validation',()=>{
 const data={host:'100.64.1.2',port:5050,token:'a'.repeat(64),fingerprint:'b'.repeat(64)};
 assert.deepEqual(decode(encode(data.host,data.port,data.token,data.fingerprint)),data);
 assert.throws(()=>decode('invalid'));
 assert.throws(()=>decode(encode('localhost',0,data.token,data.fingerprint)));
});
