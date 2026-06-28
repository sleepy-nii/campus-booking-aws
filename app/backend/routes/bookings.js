const express = require('express');
const { getPool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// GET /api/bookings — admin sees all, faculty sees own
router.get('/', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const user = req.session.user;
    let rows;
    if (user.role === 'Admin') {
      [rows] = await pool.execute(`
        SELECT b.*, u.fullName AS userName, r.name AS resourceName, r.category AS resourceCategory, r.icon AS resourceIcon
        FROM Bookings b
        LEFT JOIN Users u ON b.userId = u.id
        LEFT JOIN Resources r ON b.resourceId = r.id
        ORDER BY b.createdAt DESC
      `);
    } else {
      [rows] = await pool.execute(
        `SELECT b.*, u.fullName AS userName, r.name AS resourceName, r.category AS resourceCategory, r.icon AS resourceIcon
         FROM Bookings b
         LEFT JOIN Users u ON b.userId = u.id
         LEFT JOIN Resources r ON b.resourceId = r.id
         WHERE b.userId = ? ORDER BY b.createdAt DESC`,
        [user.id]
      );
    }
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/bookings/my
router.get('/my', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM Bookings WHERE userId = ? ORDER BY createdAt DESC',
      [req.session.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/bookings
router.post('/', requireAuth, async (req, res) => {
  const { resourceId, purpose, startTime, endTime } = req.body;
  if (!resourceId || !purpose || !startTime || !endTime)
    return res.status(400).json({ error: 'All fields are required.' });
  if (new Date(endTime) <= new Date(startTime))
    return res.status(400).json({ error: 'End time must be after start time.' });

  try {
    const pool = await getPool();
    const start = new Date(startTime);
    const end   = new Date(endTime);

    const [conflict] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM Bookings
       WHERE resourceId = ? AND status = 'Confirmed'
         AND startTime < ? AND endTime > ?`,
      [parseInt(resourceId), end, start]
    );

    if (conflict[0].cnt > 0)
      return res.status(409).json({
        error: 'This resource is already booked during the selected time. Please choose a different slot.',
      });

    const [result] = await pool.execute(
      `INSERT INTO Bookings (userId, resourceId, startTime, endTime, status, purpose)
       VALUES (?, ?, ?, ?, 'Confirmed', ?)`,
      [req.session.user.id, parseInt(resourceId), start, end, purpose.trim()]
    );

    const [newRow] = await pool.execute('SELECT * FROM Bookings WHERE id = ?', [result.insertId]);
    res.status(201).json(newRow[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// PATCH /api/bookings/:id/cancel
router.patch('/:id/cancel', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const pool = await getPool();
    const user = req.session.user;

    const [rows] = await pool.execute('SELECT * FROM Bookings WHERE id = ?', [id]);
    const booking = rows[0];
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    if (user.role !== 'Admin' && booking.userId !== user.id)
      return res.status(403).json({ error: 'Forbidden.' });

    await pool.execute("UPDATE Bookings SET status = 'Cancelled' WHERE id = ?", [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
