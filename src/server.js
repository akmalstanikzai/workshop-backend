require('dotenv').config();

const cors = require('cors');
const express = require('express');
const pool = require('./config/db');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const customerRoutes = require('./routes/customerRoutes');
const partRoutes = require('./routes/partRoutes');
const partSaleRoutes = require('./routes/partSaleRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const workshopJobRoutes = require('./routes/workshopJobRoutes');

const app = express();
const port = Number(process.env.PORT || 5000);

// Register before CORS so preflight requests are logged too.
app.use((request, response, next) => {
  const started = process.hrtime.bigint();
  let logged = false;
  const logRequest = () => {
    if (logged) return;
    logged = true;
    const duration = Number(process.hrtime.bigint() - started) / 1e6;
    const status = response.writableFinished ? response.statusCode : 'ABORTED';
    console.log(`${new Date().toISOString()} ${request.method} ${request.path} ${status} ${duration.toFixed(1)} ms`);
  };
  response.once('finish', logRequest);
  response.once('close', logRequest);
  next();
});

app.use(cors());
app.use(express.json());

app.get('/', (_request, response) => {
  response.json({ message: 'Backend API is running' });
});

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/parts', partRoutes);
app.use('/api/part-sales', partSaleRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/workshop-jobs', workshopJobRoutes);

app.use((error, _request, response, _next) => {
  console.error(error);
  if (response.headersSent) return;
  response.status(error.status && error.status < 500 ? error.status : 500).json({ error: error.status && error.status < 500 ? error.message : 'Internal server error' });
});

let server;

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('Database connected successfully');

    server = app.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error.message);
    await pool.end();
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down...`);
  if (!server) {
    await pool.end();
    process.exit(0);
  }

  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start();
