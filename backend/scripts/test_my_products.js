const http = require('http');
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/seller/my-products',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MzAsInJvbGUiOiJTZWxsZXIifQ.8Mfr-u_YZEOYIhKquH5dH5q2HMGfEEWBUdlPQ2TNY18'
  }
};

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Body:', data);
  });
});
req.on('error', (e) => { console.error('Error:', e.message); });
req.end();
