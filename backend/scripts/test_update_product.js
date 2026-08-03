const fetch = global.fetch;
const FormData = global.FormData;

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MzAsInJvbGUiOiJTZWxsZXIifQ.8Mfr-u_YZEOYIhKquH5dH5q2HMGfEEWBUdlPQ2TNY18';
const formData = new FormData();
formData.append('name', 'Updated Test Product');
formData.append('price', '19.99');
formData.append('description', 'Updated from test script');
formData.append('category', 'Grains');
formData.append('unit', 'Bag');
formData.append('stock', '5');

fetch('http://localhost:5000/api/seller/products/32', {
  method: 'PUT',
  headers: {
    Authorization: `Bearer ${token}`
  },
  body: formData
}).then(async (res) => {
  const text = await res.text();
  console.log('status', res.status);
  console.log('body', text);
}).catch(err => {
  console.error('fetch error', err);
});
