require('dotenv').config();

const pool = require('../config/db');
const { hashPassword } = require('../utils/password');

async function seedAdmin() {
  const [, , emailArgument, passwordArgument, ...nameParts] = process.argv;
  const email = (emailArgument || '').trim().toLowerCase();
  const password = passwordArgument || '';
  const name = nameParts.join(' ').trim() || 'System Administrator';

  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
    console.error('Usage: npm run seed:admin -- admin@example.com StrongPassword "Admin Name"');
    console.error('The password must be at least 8 characters.');
    process.exitCode = 1;
    return;
  }

  const passwordHash = await hashPassword(password);
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role, is_active)
     VALUES ($1, $2, $3, 'admin', true)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash,
       role = 'admin', is_active = true, updated_at = CURRENT_TIMESTAMP`,
    [name, email, passwordHash]
  );
  console.log(`Admin account is ready: ${email}`);
}

seedAdmin()
  .catch((error) => {
    console.error('Could not create admin:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
