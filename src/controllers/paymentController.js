const pool = require('../config/db');
const { requireFields, sendDatabaseError } = require('../utils/http');

async function list(request, response, next) {
  const values = [];
  const clauses = [];
  if (request.query.customer_id) { values.push(request.query.customer_id); clauses.push(`customer_id = $${values.length}`); }
  if (request.query.part_sale_id) { values.push(request.query.part_sale_id); clauses.push(`part_sale_id = $${values.length}`); }
  try {
    const result = await pool.query(`SELECT * FROM payments ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''} ORDER BY paid_at DESC LIMIT 500`, values);
    response.json(result.rows);
  } catch (error) { next(error); }
}

async function create(request, response, next) {
  if (requireFields(response, request.body, ['source', 'amount'])) return;
  const { source, customer_id: customerId, part_sale_id: partSaleId, amount } = request.body;
  if ((customerId && partSaleId) || (!customerId && !partSaleId)) return response.status(400).json({ error: 'Provide exactly one of customer_id or part_sale_id' });
  if (Number(amount) <= 0) return response.status(400).json({ error: 'amount must be greater than zero' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const payment = await client.query(`INSERT INTO payments (source, customer_id, part_sale_id, amount, recorded_by) VALUES ($1, $2, $3, $4, $5) RETURNING *`, [source, customerId || null, partSaleId || null, amount, request.user.id]);
    if (customerId) {
      await client.query(`UPDATE customers SET amount_paid = amount_paid + $1, paid_date = CURRENT_DATE, payment_status = CASE WHEN amount_paid + $1 >= total_price THEN 'paid'::payment_status ELSE 'partial'::payment_status END, updated_at = now() WHERE id = $2`, [amount, customerId]);
    }
    await client.query('COMMIT');
    response.status(201).json(payment.rows[0]);
  } catch (error) { await client.query('ROLLBACK'); sendDatabaseError(error, response, next); } finally { client.release(); }
}

module.exports = { list, create };
