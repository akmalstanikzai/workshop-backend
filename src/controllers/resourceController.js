const pool = require('../config/db');
const { pick, requireFields, sendDatabaseError } = require('../utils/http');

function resourceController({ table, fields, required = [], userField, orderBy = 'created_at DESC', searchFields = [], hasUpdatedAt = false }) {
  async function list(request, response, next) {
    const values = [];
    const clauses = [];
    if (request.query.search && searchFields.length) {
      values.push(`%${request.query.search}%`);
      clauses.push(`(${searchFields.map((field) => `${field} ILIKE $${values.length}`).join(' OR ')})`);
    }
    if (request.query.status) {
      values.push(request.query.status);
      clauses.push(`status = $${values.length}`);
    }
    const limit = Math.min(Math.max(Number(request.query.limit) || 100, 1), 500);
    const offset = Math.max(Number(request.query.offset) || 0, 0);
    try {
      const result = await pool.query(
        `SELECT * FROM ${table} ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''} ORDER BY ${orderBy} LIMIT ${limit} OFFSET ${offset}`,
        values
      );
      response.json(result.rows);
    } catch (error) { next(error); }
  }

  async function get(request, response, next) {
    try {
      const result = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [request.params.id]);
      if (!result.rows[0]) return response.status(404).json({ error: 'Record not found' });
      return response.json(result.rows[0]);
    } catch (error) { return next(error); }
  }

  async function create(request, response, next) {
    const data = pick(request.body, fields);
    if (requireFields(response, data, required)) return;
    if (userField) data[userField] = request.user.id;
    const keys = Object.keys(data);
    try {
      const result = await pool.query(
        `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
        Object.values(data)
      );
      response.status(201).json(result.rows[0]);
    } catch (error) { sendDatabaseError(error, response, next); }
  }

  async function update(request, response, next) {
    const data = pick(request.body, fields);
    const keys = Object.keys(data);
    if (!keys.length) return response.status(400).json({ error: 'No valid fields were provided' });
    try {
      const result = await pool.query(
        `UPDATE ${table} SET ${keys.map((key, i) => `${key} = $${i + 1}`).join(', ')}${hasUpdatedAt ? ', updated_at = now()' : ''} WHERE id = $${keys.length + 1} RETURNING *`,
        [...Object.values(data), request.params.id]
      );
      if (!result.rows[0]) return response.status(404).json({ error: 'Record not found' });
      return response.json(result.rows[0]);
    } catch (error) { return sendDatabaseError(error, response, next); }
  }

  async function remove(request, response, next) {
    try {
      const result = await pool.query(`DELETE FROM ${table} WHERE id = $1 RETURNING id`, [request.params.id]);
      if (!result.rows[0]) return response.status(404).json({ error: 'Record not found' });
      return response.status(204).send();
    } catch (error) { return sendDatabaseError(error, response, next); }
  }
  return { list, get, create, update, remove };
}

module.exports = resourceController;
