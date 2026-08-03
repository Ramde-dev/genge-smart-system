// create-admin.js
const bcrypt = require('bcryptjs');
const pool = require('./config/db');

const name = 'Ramde';
const email = 'Ramde@tz.com';
const password = 'Ramde1212#';
const role = 'admin';

(async () => {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user already exists
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length > 0) {
      console.log('User already exists, updating password...');
      await pool.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);
      console.log('Password updated successfully.');
    } else {
      await pool.query(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [name, email, hashedPassword, role]
      );
      console.log(`✅ Admin user "${name}" (${email}) created successfully with role "${role}"`);
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
})();