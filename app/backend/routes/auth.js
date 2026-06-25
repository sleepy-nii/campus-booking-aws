const express = require('express');
const crypto  = require('crypto');
const { getPool } = require('../config/db');
const router = express.Router();

function sha512(plain) {
  return crypto.createHash('sha512').update(plain, 'utf8').digest('hex');
}

async function writeAuditLog(pool, email, action, status, ip) {
  try {
    await pool.execute(
      'INSERT INTO AuditLog (email, action, status, ipAddress) VALUES (?, ?, ?, ?)',
      [email, action, status, ip || null]
    );
  } catch (_) {}
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required.' });

  const normalizedEmail = email.trim().toLowerCase();
  const ip = req.headers['x-forwarded-for'] || req.ip || null;

  try {
    const pool = await getPool();
    const [rows] = await pool.execute('SELECT * FROM Users WHERE email = ?', [normalizedEmail]);
    const user = rows[0];

    if (!user) {
      await writeAuditLog(pool, normalizedEmail, 'LOGIN_FAILED', 'FAILED - Invalid credentials', ip);
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      await writeAuditLog(pool, normalizedEmail, 'LOGIN_BLOCKED', 'BLOCKED - Account Locked', ip);
      return res.status(423).json({ error: 'Account is temporarily locked. Please try again later.' });
    }

    if (sha512(password) !== user.password) {
      await pool.execute('UPDATE Users SET failedAttempts = failedAttempts + 1 WHERE id = ?', [user.id]);
      // Lock after 5 failed attempts
      if (user.failedAttempts + 1 >= 5) {
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        await pool.execute('UPDATE Users SET lockedUntil = ? WHERE id = ?', [lockUntil, user.id]);
      }
      await writeAuditLog(pool, normalizedEmail, 'LOGIN_FAILED', 'FAILED - Invalid credentials', ip);
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const daysSinceChange = (Date.now() - new Date(user.passwordChangedAt).getTime()) / 86_400_000;
    if (daysSinceChange > 90) {
      await writeAuditLog(pool, normalizedEmail, 'LOGIN_BLOCKED', 'BLOCKED - Account Expired', ip);
      return res.status(403).json({
        error: 'Your password has expired (90-day policy). Please contact an administrator to reset it.',
      });
    }

    await pool.execute('UPDATE Users SET failedAttempts = 0, lockedUntil = NULL WHERE id = ?', [user.id]);
    await writeAuditLog(pool, normalizedEmail, 'LOGIN_SUCCESS', 'SUCCESS', ip);

    const sessionUser = { id: user.id, fullName: user.fullName, email: user.email, role: user.role };
    req.session.user = sessionUser;
    res.json({ user: sessionUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated.' });
  res.json({ user: req.session.user });
});

module.exports = router;
