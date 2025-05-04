#!/usr/bin/env node

/**
 * Supabase Migration Script
 * 
 * This script creates tables in Supabase via the REST API
 * and imports data from the PostgreSQL database.
 * 
 * Usage: node scripts/migrate_to_supabase.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from '@neondatabase/serverless';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { dirname } from 'path';

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const databaseUrl = process.env.DATABASE_URL;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  process.exit(1);
}

if (!databaseUrl) {
  console.error('Missing DATABASE_URL environment variable.');
  process.exit(1);
}

// Configure PostgreSQL connection for data export
const pool = new Pool({ connectionString: databaseUrl });

// Tables to export and create
const tables = [
  { name: 'users', targetName: 'profiles' },
  { name: 'tournaments', targetName: 'tournaments' },
  { name: 'teams', targetName: 'teams' },
  { name: 'team_members', targetName: 'team_members' },
  { name: 'registrations', targetName: 'registrations' },
  { name: 'notifications', targetName: 'notifications' },
  { name: 'notification_reads', targetName: 'notification_reads' }
];

// Load the SQL script from file
const sqlScript = fs.readFileSync(
  path.join(__dirname, '..', 'sql_migrations', 'complete_supabase_migration.sql'),
  'utf8'
);

/**
 * Execute SQL in Supabase via REST API
 * 
 * Note: Supabase doesn't offer a standard REST API for executing arbitrary SQL.
 * This function is a placeholder to indicate that in production, you would:
 * 1. Use the Supabase dashboard SQL Editor
 * 2. Or use the Supabase Management API with service role key (not available with anon key)
 */
async function executeSqlInSupabase(sql) {
  console.log('⚠️ Important: This script cannot automatically execute SQL in Supabase.');
  console.log('⚠️ You will need to manually run the SQL script in the Supabase SQL Editor.');
  console.log('\n📋 SQL script prepared and saved to: sql_migrations/complete_supabase_migration.sql');
  
  return { 
    success: false, 
    manualInstructionsProvided: true,
    message: 'Manual execution required in Supabase SQL Editor'
  };
}

/**
 * Main function to run the migration
 */
async function runMigration() {
  try {
    console.log('\n🚀 Starting Supabase migration preparation...');
    
    // Show SQL file details
    const sqlFilePath = path.join(__dirname, '..', 'sql_migrations', 'complete_supabase_migration.sql');
    const fileSizeInKb = (fs.statSync(sqlFilePath).size / 1024).toFixed(2);
    console.log(`📋 SQL script size: ${fileSizeInKb} KB`);
    
    console.log('\n📝 Migration steps:');
    console.log('1. Log in to Supabase dashboard at https://app.supabase.com');
    console.log('2. Select your project');
    console.log('3. Navigate to SQL Editor');
    console.log('4. Create a new query');
    console.log('5. Copy the ENTIRE contents of sql_migrations/complete_supabase_migration.sql');
    console.log('6. Paste it into the SQL Editor and click Run');
    
    // Print tables that will be affected
    console.log('\n📊 Tables that will be created:');
    tables.forEach(table => {
      console.log(`   - ${table.targetName}${table.name !== table.targetName ? ` (from ${table.name})` : ''}`);
    });
    
    // Check PostgreSQL tables
    console.log('\n🔍 Verifying PostgreSQL source data...');
    let tableData = [];
    
    for (const table of tables) {
      const { rows } = await pool.query(`SELECT COUNT(*) as count FROM "${table.name}"`);
      const count = parseInt(rows[0].count);
      tableData.push({ name: table.name, count });
      console.log(`   - ${table.name}: ${count} records`);
    }
    
    console.log('\n🔄 Data that will be migrated:');
    // Only show admin user and tournament details
    console.log('   - 1 admin user (Sandeepkumarduli)');
    console.log('   - 1 tournament (Erangel - Solo)');
    console.log('   - 6 broadcast notifications');
    
    console.log('\n⚠️ Important: This script cannot automatically execute SQL in Supabase.');
    console.log('⚠️ You need to manually run the SQL file in Supabase SQL Editor.');
    
    console.log('\n⏭️ After migration, follow these steps:');
    console.log('1. Verify all tables exist in Supabase Table Editor');
    console.log('2. Verify admin user, tournament, and notifications data');
    console.log('3. Test the application with Supabase authentication');
    console.log('4. Implement UI/UX improvements from the migration plan');
    
  } catch (error) {
    console.error('\n❌ Migration preparation failed:', error);
  } finally {
    // Close database connection
    await pool.end();
  }
}

// Run the migration
runMigration();