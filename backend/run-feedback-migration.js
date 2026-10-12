#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Read migration file
const migrationPath = path.join(__dirname, 'migrations', '0013_create_feedback.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

// Construct psql command with environment variables
const env = process.env;
const command = `psql -U postgres -d imotion_dev -c "${migrationSQL.replace(/"/g, '\\"')}"`;

try {
  console.log('🚀 Executing feedback table migration...');
  const result = execSync(command, {
    cwd: __dirname,
    env,
    stdio: 'inherit',
  });
  console.log('✅ Migration completed successfully!');
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
