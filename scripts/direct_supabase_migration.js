#!/usr/bin/env node

/**
 * Direct Supabase Migration Script
 * This script attempts to migrate data directly to Supabase using the JS client
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Setup environment
dotenv.config();

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use the new Supabase credentials directly
const supabaseUrl = 'https://fiouuhhbascmlbrncqcp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhyd2hkYW9ob3ZhaWhqeXJnd2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwMjg3NDksImV4cCI6MjA2MTYwNDc0OX0.3Y3PlXsP6SjEPSrgR9zYNwhMSHsFBsiFCPoj8NVWzWs';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

console.log(`🔑 Using Supabase URL: ${supabaseUrl}`);

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Load SQL script
const sqlFilePath = path.join(__dirname, '..', 'sql_migrations', 'complete_supabase_migration.sql');
const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');

async function runMigration() {
  try {
    console.log('🧪 Testing Supabase connection...');
    
    // Test connection by fetching the current timestamp
    const { data: timestamp, error: connectionError } = await supabase.rpc('get_timestamp');
    
    if (connectionError) {
      console.error('❌ Connection test failed:', connectionError.message);
      console.log('\n📝 Please use the Supabase SQL Editor instead:');
      console.log('1. Log in to Supabase dashboard at https://app.supabase.com');
      console.log('2. Select your project');
      console.log('3. Navigate to SQL Editor');
      console.log('4. Create a new query');
      console.log('5. Copy the ENTIRE contents of sql_migrations/complete_supabase_migration.sql');
      console.log('6. Paste it into the SQL Editor and click Run');
      return;
    }
    
    console.log('✅ Connection successful:', timestamp);
    
    // Display a preview of what will be executed
    console.log('\n📝 SQL Script Preview (first 300 characters):');
    console.log('```');
    console.log(sqlScript.substring(0, 300) + '...');
    console.log('```');
    
    console.log('\n⚠️ Important: This script will delete existing tables in Supabase and recreate them.');
    console.log('\n📋 Tables that will be affected:');
    console.log('   - profiles (users)');
    console.log('   - teams');
    console.log('   - team_members');
    console.log('   - tournaments');
    console.log('   - registrations');
    console.log('   - notifications');
    console.log('   - notification_reads');
    
    console.log('\n🔄 Data that will be migrated:');
    console.log('   - 1 admin user (Sandeepkumarduli)');
    console.log('   - 1 tournament (Erangel - Solo)');
    console.log('   - 6 broadcast notifications');
    
    console.log('\n🚨 Unfortunately, Supabase JS client does not support executing arbitrary SQL via the anon key.');
    console.log('🚨 You must use the Supabase SQL Editor in the web dashboard to run the migration script.');
    
    console.log('\n📝 Please follow these steps:');
    console.log('1. Log in to Supabase dashboard at https://app.supabase.com');
    console.log('2. Select your project');
    console.log('3. Navigate to SQL Editor');
    console.log('4. Create a new query');
    console.log('5. Copy the ENTIRE contents of sql_migrations/complete_supabase_migration.sql');
    console.log('6. Paste it into the SQL Editor and click Run');
    
  } catch (error) {
    console.error('❌ Migration preparation failed:', error);
  }
}

// Run the migration
runMigration();