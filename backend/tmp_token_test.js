const jwt = require('jsonwebtoken');
const token = jwt.sign({ id: 9, role: 'Seller' }, process.env.JWT_SECRET || 'supersecretkey123', { expiresIn: '1h' });
console.log(token);
