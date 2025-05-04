/**
 * Supabase migration script using Drizzle ORM
 * This script creates all necessary database tables based on the schema.ts file
 * 
 * Usage: 
 * 1. Make sure your .env file contains NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 * 2. Run: node scripts/migrate-supabase-drizzle.js
 */

// Import necessary modules
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { spawn } from 'child_process';
import ws from 'ws';

// Check database connection string
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Function to check if tables exist
async function getExistingTables(pool) {
  const { rows } = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `);
  return rows.map(row => row.table_name);
}

// Main function to set up the database
async function setupDatabase() {
  console.log('Connecting to database...');
  const pool = new Pool({
    connectionString: dbUrl,
  });

  try {
    // Check connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');

    // Get existing tables
    const existingTables = await getExistingTables(pool);
    console.log('Existing tables:', existingTables.length ? existingTables.join(', ') : 'None');

    // Instead of migrations, directly create tables based on schema
    const tables = [
      'users',
      'teams',
      'team_members',
      'tournaments',
      'registrations',
      'notifications',
      'notification_reads'
    ];

    // Check missing tables
    const missingTables = tables.filter(table => !existingTables.includes(table));
    if (missingTables.length === 0) {
      console.log('✅ All required tables exist. No migration needed.');
    } else {
      console.log(`❌ Missing tables: ${missingTables.join(', ')}`);
      console.log('Creating missing tables using drizzle push...');
      
      // Use npm run db:push to create tables
      const pushProcess = spawn('npm', ['run', 'db:push'], {
        stdio: 'inherit',
        shell: true
      });
      
      pushProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Successfully created all missing tables');
        } else {
          console.error(`❌ Failed to create tables with exit code ${code}`);
        }
      });
    }

  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    // Close connection
    pool.end();
  }
}

// Run the setup
setupDatabase().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});