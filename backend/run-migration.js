const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'imotion_dev',
});

async function runMigration() {
  try {
    await client.connect();
    console.log('Connected to database');

    const migrationName = process.argv[2] || '0010_create_audit_logs.sql';
    if (!/^\d{4}_[a-z0-9_]+\.sql$/i.test(migrationName)) {
      throw new Error('Migration filename must use the format 0000_name.sql');
    }

    const migrationFile = path.join(__dirname, 'migrations', migrationName);
    if (!fs.existsSync(migrationFile)) {
      throw new Error(`Migration file not found: ${migrationName}`);
    }
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    console.log(`Executing migration: ${migrationName}`);
    await client.query(sql);
    console.log('✓ Migration completed successfully');
    
    await client.end();
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
