const db = require('./config/db');
(async () => {
  try {
    const [rows] = await db.query("SELECT id, email, role FROM users WHERE role = 'Seller' LIMIT 5");
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error('ERROR', err.message);
  } finally {
    process.exit();
  }
})();
