const express = require('express');
const bcrypt  = require('bcrypt');
const { getPool } = require('../config/db');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

const SALT_ROUNDS = 12;

// GET /api/users
router.get('/', requireAdmin, async (req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.execute(
      'SELECT id, fullName, email, role, createdAt FROM Users ORDER BY id'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/users
router.post('/', requireAdmin, async (req, res) => {
  const { fullName, email, password, role } = req.body;
  if (!fullName || !email || !password || !role)
    return res.status(400).json({ error: 'All fields are required.' });

  try {
    const pool = await getPool();
    const [dup] = await pool.execute('SELECT 1 FROM Users WHERE email = ?', [email.trim().toLowerCase()]);
    if (dup.length) return res.status(409).json({ error: 'Email already registered.' });

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const [result] = await pool.execute(
      'INSERT INTO Users (fullName, email, password, role) VALUES (?, ?, ?, ?)',
      [fullName.trim(), email.trim().toLowerCase(), hash, role]
    );
    const [rows] = await pool.execute(
      'SELECT id, fullName, email, role, createdAt FROM Users WHERE id = ?',
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/users/:id
router.put('/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { fullName, email, password, role } = req.body;
  if (!fullName || !email || !role)
    return res.status(400).json({ error: 'fullName, email and role are required.' });

  try {
    const pool = await getPool();
    const [dup] = await pool.execute(
      'SELECT 1 FROM Users WHERE email = ? AND id <> ?',
      [email.trim().toLowerCase(), id]
    );
    if (dup.length) return res.status(409).json({ error: 'Email already registered.' });

    if (password) {
      const hash = await bcrypt.hash(password, SALT_ROUNDS);
      await pool.execute(
        'UPDATE Users SET fullName=?, email=?, role=?, password=? WHERE id=?',
        [fullName.trim(), email.trim().toLowerCase(), role, hash, id]
      );
    } else {
      await pool.execute(
        'UPDATE Users SET fullName=?, email=?, role=? WHERE id=?',
        [fullName.trim(), email.trim().toLowerCase(), role, id]
      );
    }

    const [rows] = await pool.execute(
      'SELECT id, fullName, email, role, createdAt FROM Users WHERE id = ?',
      [id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (id === req.session.user.id)
    return res.status(400).json({ error: 'You cannot delete your own account.' });

  try {
    const pool = await getPool();
    await pool.execute('DELETE FROM Users WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
