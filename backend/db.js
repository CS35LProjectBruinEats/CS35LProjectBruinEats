const { Pool } = require('pg');

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log("Checking DB Config...");
console.log("DB Host:", process.env.DB_HOST); // If this says 'undefined', the error will return

const pool = new Pool({
  user: String(process.env.DB_USER),
  host: String(process.env.DB_HOST),
  database: String(process.env.DB_NAME),
  password: String(process.env.DB_PASSWORD),
  port: Number(process.env.DB_PORT) || 5432,
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ DATABASE CONNECTION ERROR:', err.message);
  } else {
    console.log('✅ DATABASE CONNECTED SUCCESSFULLY AT:', res.rows[0].now);
  }
});

module.exports = pool;