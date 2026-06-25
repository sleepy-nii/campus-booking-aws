const express = require('express');
const { getPool } = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// GET /api/resources
router.get('/', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.execute('SELECT * FROM Resources ORDER BY id');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/resources
router.post('/', requireAdmin, async (req, res) => {
  const { name, category, capacity, status, icon } = req.body;
  if (!name || !category || !capacity)
    return res.status(400).json({ error: 'name, category and capacity are required.' });

  try {
    const pool = await getPool();
    const [result] = await pool.execute(
      'INSERT INTO Resources (name, category, capacity, status, icon) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), category, parseInt(capacity), status || 'Active', icon || '📦']
    );
    const [rows] = await pool.execute('SELECT * FROM Resources WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/resources/:id
router.put('/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, category, capacity, status, icon } = req.body;
  if (!name || !category || !capacity)
    return res.status(400).json({ error: 'name, category and capacity are required.' });

  try {
    const pool = await getPool();
    await pool.execute(
      'UPDATE Resources SET name=?, category=?, capacity=?, status=?, icon=? WHERE id=?',
      [name.trim(), category, parseInt(capacity), status || 'Active', icon || '📦', id]
    );
    const [rows] = await pool.execute('SELECT * FROM Resources WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// PATCH /api/resources/:id/toggle-status
router.patch('/:id/toggle-status', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const pool = await getPool();
    await pool.execute(
      "UPDATE Resources SET status = IF(status = 'Active', 'Maintenance', 'Active') WHERE id = ?",
      [id]
    );
    const [rows] = await pool.execute('SELECT * FROM Resources WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/resources/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const pool = await getPool();
    await pool.execute('DELETE FROM Resources WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
