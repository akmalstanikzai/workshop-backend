const pool = require('../config/db');

async function getHealth(_request, response) {
  try {
    const result = await pool.query('SELECT NOW() AS database_time');

    response.json({
      status: 'ok',
      database: 'connected',
      databaseTime: result.rows[0].database_time,
    });
  } catch (error) {
    console.error('Health check failed:', error);
    response.status(503).json({
      status: 'error',
      database: 'disconnected',
    });
  }
}

module.exports = { getHealth };
