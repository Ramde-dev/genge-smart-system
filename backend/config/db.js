const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'ramde123#ramde#', 
  database: process.env.DB_NAME || 'genge_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const promisePool = pool.promise();

//its show database connection if success full or not
promisePool.query('SELECT 1')
  .then(() => {
    console.log("Database connected successfully!");
  })
  .catch(err => {
    console.error("DATABASE CONNECTION FAILED:");
    console.error("Message:", err.message);
  });

module.exports = promisePool;