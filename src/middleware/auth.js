const pool = require('../config/db');
const { verifyToken } = require('../config/auth');

async function requireAuth(request, response, next) {
  const authorization = request.get('authorization') || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return response.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = verifyToken(token);
    const result = await pool.query(
      `SELECT id, name, email, role FROM users
       WHERE id = $1 AND is_active = true AND password_hash IS NOT NULL`,
      [payload.sub]
    );
    if (!result.rows[0]) {
      return response.status(401).json({ error: 'User is no longer active' });
    }
    request.user = result.rows[0];
    return next();
  } catch (_error) {
    return response.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (request, response, next) => {
    if (!roles.includes(request.user.role)) {
      return response.status(403).json({ error: 'You do not have permission to do this' });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
