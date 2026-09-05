function pick(body, fields) {
  return Object.fromEntries(fields.filter((field) => body[field] !== undefined).map((field) => [field, body[field]]));
}

function requireFields(response, values, fields) {
  const missing = fields.filter((field) => values[field] === undefined || values[field] === null || values[field] === '');
  if (!missing.length) return false;
  response.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
  return true;
}

function sendDatabaseError(error, response, next) {
  if (error.code === '23505') return response.status(409).json({ error: 'A record with that unique value already exists' });
  if (error.code === '23503') return response.status(409).json({ error: 'This record is referenced by another record or references a missing record' });
  if (error.code === '23514' || error.code === '22P02') return response.status(400).json({ error: error.detail || 'Invalid value' });
  return next(error);
}

module.exports = { pick, requireFields, sendDatabaseError };
