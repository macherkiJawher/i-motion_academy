require('dotenv').config();

const bcrypt = require('bcryptjs');
const { Client } = require('pg');

const password = process.env.ADMIN_PASSWORD;
if (!password) {
  console.error('ADMIN_PASSWORD environment variable is required.');
  process.exit(1);
}

const client = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function main() {
  await client.connect();
  const hash = await bcrypt.hash(password, 12);
  const result = await client.query(
    'UPDATE users SET password = $1 WHERE email = $2',
    [hash, 'admin@i-motion.academy'],
  );
  await client.end();

  if (result.rowCount !== 1) {
    throw new Error('Admin user was not found.');
  }
  console.log('Admin password updated successfully.');
}

main().catch(async (error) => {
  console.error(error.message);
  await client.end().catch(() => undefined);
  process.exit(1);
});
