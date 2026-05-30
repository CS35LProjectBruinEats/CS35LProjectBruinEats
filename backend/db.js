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

async function resetDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      TRUNCATE TABLE 
        users, 
        foodopps, 
        saved_opportunities,
        rsvps,
        comments 
      RESTART IDENTITY CASCADE;
    `);
  } 
  catch (error) {
    console.error('Failed to reset database:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  resetDB
};

