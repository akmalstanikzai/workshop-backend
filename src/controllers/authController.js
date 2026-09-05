const pool = require('../config/db');
const { signToken } = require('../config/auth');
const { verifyPassword } = require('../utils/password');

async function login(request, response, next) {
  const email = typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : '';
  const password = typeof request.body.password === 'string' ? request.body.password : '';

  if (!email || !password) {
    return response.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await pool.query(
      `SELECT id, name, email, role, password_hash, is_active FROM users WHERE email = $1`,
      [email]
    );
    const user = result.rows[0];
    const passwordMatches = user && await verifyPassword(password, user.password_hash);
    if (!passwordMatches || !user.is_active) return response.status(401).json({ error: 'Invalid email or password' });
    const publicUser = { id: user.id, name: user.name, email: user.email, role: user.role };
    return response.json({ token: signToken(publicUser), user: publicUser });
  } catch (error) {
    return next(error);
  }
}

function me(request, response) {
  response.json({ user: request.user });
}

module.exports = { login, me };
