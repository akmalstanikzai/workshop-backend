const pool = require('../config/db');
const { ROLES } = require('../config/auth');
const { hashPassword } = require('../utils/password');

async function listUsers(_request, response, next) {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, is_active, created_at
       FROM users WHERE password_hash IS NOT NULL ORDER BY id`
    );
    response.json(result.rows);
  } catch (error) {
    next(error);
  }
}

async function createUser(request, response, next) {
  const name = typeof request.body.name === 'string' ? request.body.name.trim() : '';
  const email = typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : '';
  const password = typeof request.body.password === 'string' ? request.body.password : '';
  const role = typeof request.body.role === 'string' ? request.body.role : '';

  if (!name || !email || !password || !role) {
    return response.status(400).json({ error: 'name, email, password and role are required' });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return response.status(400).json({ error: 'Enter a valid email address' });
  }
  if (password.length < 8) {
    return response.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  if (!ROLES.includes(role) || role === 'admin') {
    return response.status(400).json({ error: 'Select one of the four assignable roles' });
  }

  try {
    const passwordHash = await hashPassword(password);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, is_active, created_at`,
      [name, email, passwordHash, role]
    );
    return response.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return response.status(409).json({ error: 'A user with this email already exists' });
    }
    return next(error);
  }
}

async function listEngineers(_request, response, next) {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role FROM users
       WHERE is_active = true AND role IN ('telecom_engineer', 'power_engineer') ORDER BY name`
    );
    response.json(result.rows);
  } catch (error) { next(error); }
}

async function updateUser(request, response, next) {
  const email = typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : undefined;
  const name = typeof request.body.name === 'string' ? request.body.name.trim() : undefined;
  const password = typeof request.body.password === 'string' ? request.body.password : undefined;
  const role = typeof request.body.role === 'string' ? request.body.role : undefined;
  if (email !== undefined && !/^\S+@\S+\.\S+$/.test(email)) return response.status(400).json({ error: 'Enter a valid email address' });
  if (password !== undefined && password.length < 8) return response.status(400).json({ error: 'Password must be at least 8 characters' });
  if (role !== undefined && !ROLES.includes(role)) return response.status(400).json({ error: 'Invalid role' });
  const data = { ...(name !== undefined && { name }), ...(email !== undefined && { email }), ...(role !== undefined && { role }) };
  if (password) data.password_hash = await hashPassword(password);
  const keys = Object.keys(data);
  if (!keys.length) return response.status(400).json({ error: 'No valid fields were provided' });
  try {
    const result = await pool.query(
      `UPDATE users SET ${keys.map((key, index) => `${key} = $${index + 1}`).join(', ')}, updated_at = now()
       WHERE id = $${keys.length + 1} RETURNING id, name, email, role, is_active, created_at`,
      [...Object.values(data), request.params.id]
    );
    if (!result.rows[0]) return response.status(404).json({ error: 'User not found' });
    return response.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') return response.status(409).json({ error: 'A user with this email already exists' });
    return next(error);
  }
}

async function deleteUser(request, response, next) {
  if (String(request.user.id) === String(request.params.id)) return response.status(400).json({ error: 'You cannot remove your own account' });
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [request.params.id]);
    if (!result.rows[0]) return response.status(404).json({ error: 'User not found' });
    return response.status(204).send();
  } catch (error) {
    if (error.code === '23503') return response.status(409).json({ error: 'This user has workshop records and cannot be removed' });
    return next(error);
  }
}

module.exports = { listUsers, createUser, listEngineers, updateUser, deleteUser };
