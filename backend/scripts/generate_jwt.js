const crypto = require('crypto');

function base64UrlEncode(obj){
  const str = JSON.stringify(obj);
  return Buffer.from(str).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
}

const header = { alg: 'HS256', typ: 'JWT' };
const payload = { id: 30, role: 'Seller' };
// Use app secret explicitly for testing
const secret = 'supersecretkey123';

const data = `${base64UrlEncode(header)}.${base64UrlEncode(payload)}`;
const sig = crypto.createHmac('sha256', secret).update(data).digest('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
console.log(`${data}.${sig}`);
