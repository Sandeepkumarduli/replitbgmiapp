import { supabase } from './supabase';

// Function to check database connection and print diagnostic information
export async function checkDatabaseConnection() {
  console.log('===== CHECKING DATABASE CONNECTION =====');
  
  try {
    // First, check basic connectivity
    console.log('Checking basic Supabase connectivity...');
    const { data: pingData, error: pingError } = await supabase.from('_dummy_ping').select('*').limit(1);
    
    if (pingError) {
      console.log('Basic connectivity test - Error (expected):', pingError.code, pingError.message);
      console.log('This is normal if the _dummy_ping table does not exist');
    } else {
      console.log('Basic connectivity test - Success');
    }
    
    // Check if we can list tables
    console.log('Checking database tables...');
    const tables = ['users', 'teams', 'team_members', 'tournaments', 'registrations', 'notifications', 'notification_reads', 'admins'];
    
    // Try to get the count from each table to see if it exists
    for (const table of tables) {
      console.log(`Checking table: ${table}`);
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`Table '${table}' check failed:`, error.code, error.message);
        console.log(`  Error details:`, error.details);
      } else {
        console.log(`Table '${table}' exists with ${count} rows`);
      }
    }
    
    // Log Supabase client configuration (without sensitive info)
    console.log('Supabase client configuration:');
    console.log('  URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set (masked)' : 'Not set');
    console.log('  Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set (masked)' : 'Not set');
    
    // Verify if tables need to be created in Supabase dashboard
    console.log('IMPORTANT: If tables do not exist, you need to create them in the Supabase dashboard.');
    console.log('The JavaScript client with anon key CANNOT create tables.');
    console.log('Please visit the Supabase dashboard, go to SQL Editor, and run the table creation scripts.');
    
    console.log('===== DATABASE CHECK COMPLETE =====');
  } catch (error) {
    console.error('Error checking database connection:', error);
  }
}

// Function to generate SQL for creating tables (to be executed in Supabase dashboard)
export function generateCreateTableSQL() {
  const sql = `
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL UNIQUE,
  phone_verified BOOLEAN NOT NULL DEFAULT false,
  phone_verification_bypassed BOOLEAN NOT NULL DEFAULT false,
  firebase_uid TEXT,
  game_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  game_type TEXT NOT NULL DEFAULT 'BGMI',
  invite_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id),
  username TEXT NOT NULL,
  game_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tournaments table
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
);

-- Create registrations table
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
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  user_id INTEGER REFERENCES users(id),
  related_id INTEGER,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create notification_reads table
CREATE TABLE IF NOT EXISTS notification_reads (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  notification_id INTEGER NOT NULL REFERENCES notifications(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, notification_id)
);

-- Create admins table
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
);
  `;
  
  console.log('===== SQL FOR TABLE CREATION =====');
  console.log(sql);
  console.log('===== END SQL SCRIPT =====');
  
  return sql;
}

// Function to test the run_sql function
export async function testRunSqlFunction() {
  try {
    console.log('Testing run_sql function in Supabase...');
    
    // Try to use the run_sql function
    const { data, error } = await supabase.rpc('run_sql', { 
      sql_query: 'SELECT COUNT(*) FROM users' 
    });
    
    if (error) {
      console.error('Error using run_sql function:', error);
      console.log('You need to create the run_sql function in Supabase SQL Editor:');
      console.log(`
CREATE OR REPLACE FUNCTION public.run_sql(sql_query TEXT) 
RETURNS SETOF json AS $$
BEGIN
    RETURN QUERY EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
      `);
      return { 
        success: false, 
        error,
        function_definition: `
-- Run this in the Supabase SQL Editor to create the necessary function
CREATE OR REPLACE FUNCTION public.run_sql(sql_query TEXT) 
RETURNS SETOF json AS $$
BEGIN
    RETURN QUERY EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- This function must be executed as a database administrator
-- It allows your application to execute arbitrary SQL through the API
-- It is required for many of the diagnostic functions to work properly
`
      };
    }
    
    console.log('run_sql function test successful! Result:', data);
    return { success: true, data };
  } catch (err) {
    console.error('Exception testing run_sql function:', err);
    return { success: false, error: err };
  }
}

// Generate the SQL needed to create the execute_sql function
export function generateExecuteSqlFunction() {
  return `
-- Run this in the Supabase SQL Editor to create the necessary functions
-- These functions are required for the application to work properly

-- Function to execute arbitrary SQL (required for diagnostics and schema management)
CREATE OR REPLACE FUNCTION public.run_sql(sql_query TEXT) 
RETURNS SETOF json AS $$
BEGIN
    RETURN QUERY EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Alternative function name for compatibility
CREATE OR REPLACE FUNCTION public.execute_sql(query TEXT) 
RETURNS SETOF json AS $$
BEGIN
    RETURN QUERY EXECUTE query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to list all tables in the public schema
CREATE OR REPLACE FUNCTION public.list_tables()
RETURNS TABLE(table_name text) AS $$
BEGIN
    RETURN QUERY 
    SELECT t.table_name::text
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a test table (for diagnostics)
CREATE OR REPLACE FUNCTION public.create_test_table()
RETURNS text AS $$
BEGIN
    EXECUTE 'CREATE TABLE IF NOT EXISTS test_table (id serial primary key, name text, created_at timestamp default now())';
    RETURN 'Test table created';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to drop the test table
CREATE OR REPLACE FUNCTION public.drop_test_table()
RETURNS text AS $$
BEGIN
    EXECUTE 'DROP TABLE IF EXISTS test_table';
    RETURN 'Test table dropped';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make sure to run these SQL statements in the Supabase SQL Editor
-- They cannot be run from the JavaScript client directly
`;
}

// Add a direct check function that can be exposed via API
export async function getDirectDatabaseStatus() {
  try {
    const tables = ['users', 'teams', 'team_members', 'tournaments', 'registrations', 'notifications', 'notification_reads', 'admins'];
    const tableStatuses = [];
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
          tableStatuses.push({ 
            table, 
            exists: false, 
            count: 0, 
            error: { code: error.code, message: error.message } 
          });
        } else {
          tableStatuses.push({ table, exists: true, count });
        }
      } catch (err: any) {
        tableStatuses.push({ 
          table, 
          exists: false, 
          count: 0, 
          error: { message: err.message } 
        });
      }
    }
    
    // Also test the run_sql function
    const runSqlTest = await testRunSqlFunction();
    
    return {
      status: 'checked',
      connection: 'connected',
      tables: tableStatuses,
      runSqlFunction: runSqlTest.success ? 'working' : 'not working',
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? '(set but masked)' : 'not set',
      sqlScript: 'Available on server console',
      message: 'Database tables need to be created manually in the Supabase dashboard'
    };
  } catch (error: any) {
    return {
      status: 'error',
      connection: 'error',
      message: error.message,
      sqlScript: 'Check server console'
    };
  }
}