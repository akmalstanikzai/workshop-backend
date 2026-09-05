const resourceController = require('./resourceController');
const pool = require('../config/db');
const { pick, requireFields, sendDatabaseError } = require('../utils/http');

const fields = ['serial_number', 'name', 'mobile_number', 'company_name', 'received_item', 'received_date', 'repairing_price', 'repairing_date', 'handover_date', 'quantity', 'total_price', 'payment_status', 'amount_paid', 'paid_date', 'assigned_engineer_id', 'progress'];
const base = resourceController({ table: 'customers', fields, required: ['name', 'mobile_number', 'received_item', 'received_date'], userField: 'created_by', searchFields: ['code', 'serial_number', 'name', 'mobile_number', 'company_name', 'received_item'], hasUpdatedAt: true });

async function get(request, response, next) {
  try {
    const customer = await pool.query('SELECT * FROM customers WHERE id = $1', [request.params.id]);
    if (!customer.rows[0]) return response.status(404).json({ error: 'Customer not found' });
    const [items, parts, payments] = await Promise.all([
      pool.query('SELECT * FROM customer_items WHERE customer_id = $1 ORDER BY created_at', [request.params.id]),
      pool.query(`SELECT cp.*, p.code AS part_code, p.name AS part_name FROM customer_parts cp JOIN parts p ON p.id = cp.part_id WHERE cp.customer_id = $1 ORDER BY cp.created_at`, [request.params.id]),
      pool.query(`SELECT * FROM payments WHERE customer_id = $1 ORDER BY paid_at DESC`, [request.params.id]),
    ]);
    return response.json({ ...customer.rows[0], items: items.rows, parts: parts.rows, payments: payments.rows });
  } catch (error) { return next(error); }
}

async function addItem(request, response, next) {
  const data = pick(request.body, ['serial_number']);
  if (requireFields(response, data, ['serial_number'])) return;
  try {
    const result = await pool.query('INSERT INTO customer_items (customer_id, serial_number) VALUES ($1, $2) RETURNING *', [request.params.id, data.serial_number]);
    response.status(201).json(result.rows[0]);
  } catch (error) { sendDatabaseError(error, response, next); }
}

async function addPart(request, response, next) {
  const { part_id: partId, quantity } = request.body;
  if (requireFields(response, request.body, ['part_id', 'quantity'])) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const part = await client.query('SELECT quantity, sale_price FROM parts WHERE id = $1 FOR UPDATE', [partId]);
    if (!part.rows[0]) { await client.query('ROLLBACK'); return response.status(404).json({ error: 'Part not found' }); }
    if (!Number.isInteger(Number(quantity)) || Number(quantity) <= 0) { await client.query('ROLLBACK'); return response.status(400).json({ error: 'quantity must be a positive integer' }); }
    if (part.rows[0].quantity < quantity) { await client.query('ROLLBACK'); return response.status(409).json({ error: 'Insufficient part stock' }); }
    const unitPrice = request.body.unit_price ?? part.rows[0].sale_price;
    const result = await client.query(`INSERT INTO customer_parts (customer_id, part_id, quantity, unit_price, added_by) VALUES ($1, $2, $3, $4, $5) RETURNING *`, [request.params.id, partId, quantity, unitPrice, request.user.id]);
    await client.query('UPDATE parts SET quantity = quantity - $1 WHERE id = $2', [quantity, partId]);
    await client.query('COMMIT');
    response.status(201).json(result.rows[0]);
  } catch (error) { await client.query('ROLLBACK'); sendDatabaseError(error, response, next); } finally { client.release(); }
}

module.exports = { ...base, get, addItem, addPart };
