const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function run() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'jawher',
    database: 'imotion_dev',
  });

  try {
    await client.connect();
    const user = await client.query("SELECT id, email, role, password FROM users WHERE email = $1", ['admin@i-motion.academy']);
    console.log('USER_ROWS', JSON.stringify(user.rows, null, 2));
    const hash = user.rows[0]?.password || null;
    if (hash) {
      const ok = await bcrypt.compare('admin123', hash);
      console.log('COMPARE_ADMIN123', ok);
      const ok2 = await bcrypt.compare('admin', hash);
      console.log('COMPARE_ADMIN', ok2);
    }
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
