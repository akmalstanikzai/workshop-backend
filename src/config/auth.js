const ROLES = Object.freeze([
  'admin',
  'data_entry',
  'cashier',
  'telecom_engineer',
  'power_engineer',
]);

const TOKEN_LIFETIME_SECONDS = 8 * 60 * 60;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
  return secret;
}

function encode(value) { return Buffer.from(JSON.stringify(value)).toString('base64url'); }

function signToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({ sub: String(user.id), name: user.name, email: user.email, role: user.role, iat: now, exp: now + TOKEN_LIFETIME_SECONDS });
  const signature = crypto.createHmac('sha256', getJwtSecret()).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

function verifyToken(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token');
  const expected = crypto.createHmac('sha256', getJwtSecret()).update(`${parts[0]}.${parts[1]}`).digest();
  const received = Buffer.from(parts[2], 'base64url');
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) throw new Error('Invalid token');
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) throw new Error('Token expired');
  return payload;
}

module.exports = { ROLES, signToken, verifyToken };
const crypto = require('crypto');
