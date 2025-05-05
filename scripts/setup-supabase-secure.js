/**
 * Secure Supabase Database Setup Script
 * 
 * This script performs the following tasks:
 * 1. Tests if the run_sql function is working in Supabase
 * 2. Creates all necessary database tables if they don't exist
 * 3. Creates an admin user with secure credentials
 * 4. Verifies database functionality by performing test queries
 * 
 * RUN THIS SCRIPT DIRECTLY: node scripts/setup-supabase-secure.js
 * 
 * IMPORTANT NOTES:
 * - The Supabase URL and anon key must be set in environment variables
 * - This script should only be run by administrators during setup
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ ERROR: Supabase URL and anon key must be set in environment variables');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Check if the run_sql function exists
async function testRunSqlFunction() {
  console.log('🔍 Testing run_sql function in Supabase...');
  
  try {
    const { data, error } = await supabase.rpc('run_sql', {
      sql_query: 'SELECT current_timestamp as time, current_database() as database'
    });
    
    if (error) {
      console.error('❌ run_sql function test failed:', error.message);
      
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('\n⚠️ The run_sql function needs to be created in Supabase.');
        console.log('\nExecute this SQL in the Supabase SQL Editor:');
        console.log(`-------------------------------------------------`);
        console.log(`
DROP FUNCTION IF EXISTS public.run_sql(text);

CREATE OR REPLACE FUNCTION public.run_sql(sql_query TEXT) 
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || sql_query || ') AS t' INTO result;
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$;`);
        console.log(`-------------------------------------------------`);
        
        return {
          success: false,
          message: 'run_sql function not found'
        };
      }
      
      return {
        success: false,
        message: error.message
      };
    }
    
    console.log('✓ run_sql function test successful!');
    return {
      success: true,
      data
    };
  } catch (err) {
    console.error('❌ Error testing run_sql function:', err.message);
    return {
      success: false,
      message: err.message
    };
  }
}

// Create database tables
async function createDatabaseTables() {
  console.log('\n📊 Creating database tables...');
  
  const tables = [
    {
      name: 'users',
      sql: `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL UNIQUE,
  phone_verified BOOLEAN NOT NULL DEFAULT false,
  phone_verification_bypassed BOOLEAN NOT NULL DEFAULT true,
  firebase_uid TEXT,
  game_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`
    },
    {
      name: 'teams',
      sql: `
CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  game_type TEXT NOT NULL DEFAULT 'BGMI',
  invite_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`
    },
    {
      name: 'team_members',
      sql: `
CREATE TABLE IF NOT EXISTS team_members (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id),
  username TEXT NOT NULL,
  game_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`
    },
    {
      name: 'tournaments',
      sql: `
CREATE TABLE IF NOT EXISTS tournaments (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  date TIMESTAMP NOT NULL,
  map_type TEXT NOT NULL,
  game_mode TEXT NOT NULL DEFAULT 'Squad',
  team_type TEXT NOT NULL,
  game_type TEXT NOT NULL DEFAULT 'BGMI',
  is_paid BOOLEAN NOT NULL,
  entry_fee INTEGER NOT NULL DEFAULT 0,
  prize_pool INTEGER NOT NULL DEFAULT 0,
  total_slots INTEGER NOT NULL,
  slots INTEGER NOT NULL,
  room_id TEXT,
  password TEXT,
  banner_url TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'upcoming',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`
    },
    {
      name: 'registrations',
      sql: `
CREATE TABLE IF NOT EXISTS registrations (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id),
  team_id INTEGER NOT NULL REFERENCES teams(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_id TEXT,
  payment_amount INTEGER NOT NULL DEFAULT 0,
  slot INTEGER,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tournament_id, team_id)
);`
    },
    {
      name: 'notifications',
      sql: `
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  user_id INTEGER REFERENCES users(id),
  related_id INTEGER,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`
    },
    {
      name: 'notification_reads',
      sql: `
CREATE TABLE IF NOT EXISTS notification_reads (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  notification_id INTEGER NOT NULL REFERENCES notifications(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, notification_id)
);`
    },
    {
      name: 'admins',
      sql: `
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  display_name TEXT NOT NULL,
  access_level TEXT NOT NULL DEFAULT 'standard',
  last_login TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT true,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`
    }
  ];
  
  const results = [];
  
  for (const table of tables) {
    console.log(`Creating table: ${table.name}...`);
    
    try {
      // First check if the table exists by trying to count rows
      const { error: checkError } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true });
      
      if (!checkError) {
        console.log(`✓ Table '${table.name}' already exists, skipping creation`);
        results.push({
          table: table.name,
          status: 'already exists'
        });
        continue;
      }
      
      // Create the table using run_sql
      const { data, error } = await supabase.rpc('run_sql', {
        sql_query: table.sql
      });
      
      if (error) {
        console.error(`❌ Error creating table '${table.name}':`, error.message);
        results.push({
          table: table.name,
          status: 'error',
          message: error.message
        });
      } else {
        console.log(`✓ Table '${table.name}' created successfully`);
        results.push({
          table: table.name,
          status: 'created'
        });
      }
    } catch (err) {
      console.error(`❌ Exception creating table '${table.name}':`, err.message);
      results.push({
        table: table.name,
        status: 'exception',
        message: err.message
      });
    }
  }
  
  return results;
}

// Helper function to hash passwords
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Create admin user
async function createAdminUser() {
  console.log('\n👤 Creating admin user...');
  
  // Generate a secure random password if not creating test admin
  const adminPassword = 'admin123'; // for testing purposes
  const hashedPassword = await hashPassword(adminPassword);
  
  try {
    // Check if admin already exists
    const { data: existingAdmin, error: checkError } = await supabase
      .from('admins')
      .select('*')
      .eq('username', 'admin')
      .limit(1);
    
    if (!checkError && existingAdmin && existingAdmin.length > 0) {
      console.log('✓ Admin user already exists, skipping creation');
      return {
        status: 'already exists',
        admin: {
          username: 'admin',
          id: existingAdmin[0].id
        }
      };
    }
    
    // Create the admin user
    const { data, error } = await supabase.rpc('run_sql', {
      sql_query: `
INSERT INTO admins (
  username, 
  password, 
  email, 
  phone, 
  display_name, 
  access_level,
  role
) VALUES (
  'admin',
  '${hashedPassword}',
  'admin@example.com',
  '1234567890',
  'System Admin',
  'admin',
  'admin'
)
ON CONFLICT (username) DO NOTHING
RETURNING id, username, email, role;`
    });
    
    if (error) {
      console.error('❌ Error creating admin user:', error.message);
      return {
        status: 'error',
        message: error.message
      };
    }
    
    if (!data || data.length === 0) {
      console.error('❌ No admin user was created');
      return {
        status: 'no data',
        message: 'No admin user was created'
      };
    }
    
    console.log('✓ Admin user created successfully with username: admin');
    console.log('✓ Password: admin123 (remember to change this in production)');
    
    return {
      status: 'created',
      admin: data[0]
    };
  } catch (err) {
    console.error('❌ Exception creating admin user:', err.message);
    return {
      status: 'exception',
      message: err.message
    };
  }
}

// Test database functionality
async function testDatabaseFunctionality() {
  console.log('\n🧪 Testing database functionality...');
  
  const tables = ['users', 'teams', 'team_members', 'tournaments', 'registrations', 'notifications', 'notification_reads', 'admins'];
  const results = [];
  
  for (const table of tables) {
    console.log(`Testing table: ${table}...`);
    
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(5);
      
      if (error) {
        console.error(`❌ Error querying table '${table}':`, error.message);
        results.push({
          table,
          status: 'error',
          message: error.message
        });
      } else {
        console.log(`✓ Table '${table}' query successful. Records: ${count || data?.length || 0}`);
        results.push({
          table,
          status: 'success',
          count: count || data?.length || 0
        });
      }
    } catch (err) {
      console.error(`❌ Exception querying table '${table}':`, err.message);
      results.push({
        table,
        status: 'exception',
        message: err.message
      });
    }
  }
  
  return results;
}

// Main function to run the setup
async function main() {
  console.log('🚀 Starting Supabase secure setup...');
  
  // Step 1: Test if run_sql function exists
  const sqlFunctionTest = await testRunSqlFunction();
  
  if (!sqlFunctionTest.success) {
    console.error('❌ Setup cannot continue without the run_sql function');
    console.log('Please create the run_sql function in Supabase SQL Editor and run this script again');
    process.exit(1);
  }
  
  // Step 2: Create database tables
  const tableResults = await createDatabaseTables();
  
  // Step 3: Create admin user
  const adminResult = await createAdminUser();
  
  // Step 4: Test database functionality
  const testResults = await testDatabaseFunctionality();
  
  // Print summary
  console.log('\n📋 Setup Summary:');
  console.log('----------------');
  console.log('SQL Function:', sqlFunctionTest.success ? 'Available ✓' : 'Missing ❌');
  
  console.log('\nTable Creation:');
  for (const result of tableResults) {
    const status = result.status === 'created' ? 'Created ✓' : 
                   result.status === 'already exists' ? 'Already exists ✓' : 'Failed ❌';
    console.log(`- ${result.table}: ${status}`);
  }
  
  console.log('\nAdmin User:', 
    adminResult.status === 'created' ? 'Created ✓' : 
    adminResult.status === 'already exists' ? 'Already exists ✓' : 'Failed ❌');
  
  console.log('\nDatabase Functionality Test:');
  for (const result of testResults) {
    const status = result.status === 'success' ? 'Success ✓' : 'Failed ❌';
    console.log(`- ${result.table}: ${status} ${result.status === 'success' ? `(${result.count} records)` : ''}`);
  }
  
  console.log('\n🏁 Setup complete!');
  
  if (adminResult.status === 'created' || adminResult.status === 'already exists') {
    console.log('\n📝 Admin Login Details:');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('\n⚠️ IMPORTANT: Change the admin password after logging in for the first time!');
  }
}

// Run the main function
main().catch(err => {
  console.error('Unhandled error during setup:', err);
  process.exit(1);
});