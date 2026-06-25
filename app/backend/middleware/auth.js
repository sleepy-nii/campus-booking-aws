function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.session.user.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });
  next();
}

module.exports = { requireAuth, requireAdmin };
