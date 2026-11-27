const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const net=require('node:net');
const https=require('node:https');
const {execFileSync}=require('node:child_process');
const file=path.join(os.homedir(),'.termichat','settings.json');
const defaults={username:'',method:'auto',port:5050,address:''};
function validate(s){
 if(!['auto','lan','tailscale','public','manual'].includes(s.method)) throw Error('Invalid network method.');
 if(!Number.isInteger(s.port)||s.port<1||s.port>65535) throw Error('Invalid port.');
 if(s.username&&!/^[a-zA-Z0-9_-]{1,24}$/.test(s.username)) throw Error('Invalid username.');
 if(s.method==='manual'&&!(net.isIP(s.address)||/^[a-z0-9][a-z0-9.-]{0,252}$/i.test(s.address))) throw Error('Enter a valid host address.');
 return s;
}
function load(){try{return validate({...defaults,...JSON.parse(fs.readFileSync(file,'utf8'))});}catch(e){if(e.code==='ENOENT')return {...defaults};throw e;}}
function save(s){validate(s);fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});fs.writeFileSync(file,JSON.stringify(s,null,2)+'\n',{mode:0o600});}
function localAddresses(){return Object.values(os.networkInterfaces()).flat().filter(x=>x&&x.family==='IPv4'&&!x.internal).map(x=>x.address);}
function tailscale(){
 for(const cmd of ['tailscale',...(process.platform==='darwin'?['/Applications/Tailscale.app/Contents/MacOS/Tailscale']:[])]){
  try{const ip=execFileSync(cmd,['ip','-4'],{encoding:'utf8',timeout:2000,stdio:['ignore','pipe','ignore']}).trim().split(/\s+/)[0];if(net.isIPv4(ip))return ip;}catch{}
 }
 return localAddresses().find(ip=>{const [a,b]=ip.split('.').map(Number);return a===100&&b>=64&&b<=127;})||null;
}
function publicIP(){return new Promise((resolve,reject)=>{
 const req=https.get('https://api.ipify.org',res=>{let body='';res.on('data',c=>{body+=c;if(body.length>128)req.destroy(Error('Invalid IP response'));});res.on('end',()=>{const ip=body.trim();if(res.statusCode===200&&net.isIPv4(ip))resolve(ip);else reject(Error('Public IP lookup failed.'));});});
 req.setTimeout(5000,()=>req.destroy(Error('Public IP lookup timed out.')));req.on('error',reject);
});}
async function resolveAddress(s){
 if(s.method==='manual')return {host:s.address,method:'manual'};
 if(s.method==='public')return {host:await publicIP(),method:'public'};
 if(s.method==='auto'||s.method==='tailscale'){const ip=tailscale();if(ip)return {host:ip,method:'tailscale'};if(s.method==='tailscale')throw Error('Tailscale unavailable. Connect Tailscale or change settings.');}
 const ip=localAddresses().find(ip=>{const [a,b]=ip.split('.').map(Number);return !(a===100&&b>=64&&b<=127);});
 if(!ip)throw Error('No LAN IPv4 address detected.');
 return {host:ip,method:'lan'};
}
module.exports={load,save,validate,resolveAddress,localAddresses};
