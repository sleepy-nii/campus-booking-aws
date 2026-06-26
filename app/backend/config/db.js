const mysql = require('mysql2/promise');

let pool = null;

async function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host:               process.env.DB_HOST     || 'localhost',
      port:               parseInt(process.env.DB_PORT || '3306'),
      database:           process.env.DB_NAME     || 'CampusBookingDB',
      user:               process.env.DB_USER     || 'admin',
      password:           process.env.DB_PASSWORD || '',
      ssl:                { rejectUnauthorized: false },
      waitForConnections: true,
      connectionLimit:    10,
      queueLimit:         0,
    });
  }
  return pool;
}

module.exports = { getPool };
