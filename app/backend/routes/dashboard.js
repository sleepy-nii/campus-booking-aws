const express = require('express');
const { getPool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const user = req.session.user;
    const isAdmin = user.role === 'Admin';

    const [[resRow]] = await pool.execute(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status='Active'      THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN status='Maintenance' THEN 1 ELSE 0 END) AS maintenance
      FROM Resources
    `);

    let bkQuery = `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status='Confirmed' THEN 1 ELSE 0 END) AS confirmed,
        SUM(CASE WHEN status='Cancelled' THEN 1 ELSE 0 END) AS cancelled
      FROM Bookings
    `;
    const params = [];
    if (!isAdmin) {
      bkQuery += ' WHERE userId = ?';
      params.push(user.id);
    }
    const [[bkRow]] = await pool.execute(bkQuery, params);

    res.json({ resources: resRow, bookings: bkRow });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
