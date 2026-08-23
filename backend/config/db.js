const mysql = require('mysql2');
require('dotenv').config();

const requiredDatabaseEnv = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingDatabaseEnv = requiredDatabaseEnv.filter((name) => !process.env[name]);
if (missingDatabaseEnv.length) {
  throw new Error(`Missing required database configuration: ${missingDatabaseEnv.join(', ')}`);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const promisePool = pool.promise();

//its show database connection if success full or not
promisePool.query('SELECT 1')
  .then(() => {})
  .catch(err => {
    console.error("DATABASE CONNECTION FAILED:");
    console.error("Message:", err.message);
  });

module.exports = promisePool;