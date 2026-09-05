const resourceController = require('./resourceController');
const pool = require('../config/db');
const { requireFields, sendDatabaseError } = require('../utils/http');

const parts = resourceController({
  table: 'parts',
  fields: ['name', 'serial_number', 'quantity', 'unit_price', 'purchase_date', 'sale_price'],
  required: ['name', 'quantity', 'unit_price', 'purchase_date', 'sale_price'],
  userField: 'created_by',
  searchFields: ['code', 'serial_number', 'name'],
});

async function listSales(request, response, next) {
  try {
    const result = await pool.query(`SELECT ps.*, p.code AS part_code, p.name AS part_name FROM part_sales ps JOIN parts p ON p.id = ps.part_id ORDER BY ps.sold_at DESC LIMIT 500`);
    response.json(result.rows);
  } catch (error) { next(error); }
}

async function createSale(request, response, next) {
  if (requireFields(response, request.body, ['part_id', 'quantity'])) return;
  const quantity = Number(request.body.quantity);
  if (!Number.isInteger(quantity) || quantity <= 0) return response.status(400).json({ error: 'quantity must be a positive integer' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const part = await client.query('SELECT quantity, sale_price FROM parts WHERE id = $1 FOR UPDATE', [request.body.part_id]);
    if (!part.rows[0]) { await client.query('ROLLBACK'); return response.status(404).json({ error: 'Part not found' }); }
    if (part.rows[0].quantity < quantity) { await client.query('ROLLBACK'); return response.status(409).json({ error: 'Insufficient part stock' }); }
    const unitPrice = request.body.unit_price ?? part.rows[0].sale_price;
    const sale = await client.query(`INSERT INTO part_sales (part_id, quantity, unit_price, sold_by) VALUES ($1, $2, $3, $4) RETURNING *`, [request.body.part_id, quantity, unitPrice, request.user.id]);
    await client.query('UPDATE parts SET quantity = quantity - $1 WHERE id = $2', [quantity, request.body.part_id]);
    await client.query('COMMIT');
    return response.status(201).json(sale.rows[0]);
  } catch (error) { await client.query('ROLLBACK'); return sendDatabaseError(error, response, next); } finally { client.release(); }
}

module.exports = { parts, listSales, createSale };
