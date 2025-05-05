/**
 * Simple Supabase Table Creation Script
 * 
 * This script directly creates basic database tables using the run_sql function.
 * It focuses on just the core functionality without added complexity:
 * 1. Creates necessary database tables if they don't exist
 * 2. Creates an admin user if it doesn't exist
 * 
 * Usage: node scripts/create-tables.js
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ ERROR: Supabase credentials not found in environment variables');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to hash passwords
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Function to create all tables
async function createTables() {
  console.log('🔵 Creating database tables...');

  const tables = [
    // Users table
    {
      name: 'users',
      query: "CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username TEXT NOT NULL UNIQUE, password TEXT NOT NULL, email TEXT NOT NULL UNIQUE, phone TEXT NOT NULL UNIQUE, phone_verified BOOLEAN NOT NULL DEFAULT false, phone_verification_bypassed BOOLEAN NOT NULL DEFAULT true, firebase_uid TEXT, game_id TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"
    },
    
    // Teams table
    {
      name: 'teams',
      query: "CREATE TABLE IF NOT EXISTS teams (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, owner_id INTEGER NOT NULL REFERENCES users(id), game_type TEXT NOT NULL DEFAULT 'BGMI', invite_code TEXT NOT NULL UNIQUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"
    },
    
    // Team Members table
    {
      name: 'team_members',
      query: "CREATE TABLE IF NOT EXISTS team_members (id SERIAL PRIMARY KEY, team_id INTEGER NOT NULL REFERENCES teams(id), username TEXT NOT NULL, game_id TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"
    },
    
    // Tournaments table
    {
      name: 'tournaments',
      query: "CREATE TABLE IF NOT EXISTS tournaments (id SERIAL PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, date TIMESTAMP NOT NULL, map_type TEXT NOT NULL, game_mode TEXT NOT NULL DEFAULT 'Squad', team_type TEXT NOT NULL, game_type TEXT NOT NULL DEFAULT 'BGMI', is_paid BOOLEAN NOT NULL, entry_fee INTEGER NOT NULL DEFAULT 0, prize_pool INTEGER NOT NULL DEFAULT 0, total_slots INTEGER NOT NULL, slots INTEGER NOT NULL, room_id TEXT, password TEXT, banner_url TEXT, created_by INTEGER NOT NULL REFERENCES users(id), status TEXT NOT NULL DEFAULT 'upcoming', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"
    },
    
    // Registrations table
    {
      name: 'registrations',
      query: "CREATE TABLE IF NOT EXISTS registrations (id SERIAL PRIMARY KEY, tournament_id INTEGER NOT NULL REFERENCES tournaments(id), team_id INTEGER NOT NULL REFERENCES teams(id), user_id INTEGER NOT NULL REFERENCES users(id), payment_status TEXT NOT NULL DEFAULT 'pending', payment_id TEXT, payment_amount INTEGER NOT NULL DEFAULT 0, slot INTEGER, registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(tournament_id, team_id))"
    },
    
    // Notifications table
    {
      name: 'notifications',
      query: "CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, title TEXT NOT NULL, message TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'info', user_id INTEGER REFERENCES users(id), related_id INTEGER, is_read BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"
    },
    
    // Notification Reads table
    {
      name: 'notification_reads',
      query: "CREATE TABLE IF NOT EXISTS notification_reads (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), notification_id INTEGER NOT NULL REFERENCES notifications(id), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, notification_id))"
    },
    
    // Admins table
    {
      name: 'admins',
      query: "CREATE TABLE IF NOT EXISTS admins (id SERIAL PRIMARY KEY, username TEXT NOT NULL UNIQUE, password TEXT NOT NULL, email TEXT NOT NULL UNIQUE, phone TEXT NOT NULL, display_name TEXT NOT NULL, access_level TEXT NOT NULL DEFAULT 'standard', last_login TIMESTAMP, is_active BOOLEAN NOT NULL DEFAULT true, role TEXT NOT NULL DEFAULT 'admin', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"
    }
  ];

  // Execute each table creation query
  for (const [index, table] of tables.entries()) {
    console.log(`Creating table ${index + 1}/${tables.length}: ${table.name}...`);
    try {
      // First check if table exists
      const { data: checkData, error: checkError } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true });
      
      if (checkError && checkError.code === '42P01') {
        // Table doesn't exist, create it
        const { data, error } = await supabase.rpc('run_sql', { 
          sql_query: table.query
        });
        
        if (error) {
          console.error(`❌ Error creating table ${table.name}: ${error.message}`);
        } else {
          console.log(`✅ Table ${table.name} created successfully`);
        }
      } else if (checkError) {
        console.error(`❌ Error checking table ${table.name}: ${checkError.message}`);
      } else {
        console.log(`ℹ️ Table ${table.name} already exists, skipping creation`);
      }
    } catch (err) {
      console.error(`❌ Exception with table ${table.name}: ${err.message}`);
    }
  }
  
  console.log('🔵 Table creation process completed');
}

// Function to create admin user
async function createAdminUser() {
  console.log('🔵 Creating admin user...');
  
  try {
    // Check if admin user already exists
    const { data: adminCheck, error: checkError } = await supabase
      .from('admins')
      .select('id, username')
      .eq('username', 'admin')
      .limit(1);
    
    if (!checkError && adminCheck && adminCheck.length > 0) {
      console.log(`✅ Admin user already exists (ID: ${adminCheck[0].id})`);
      return;
    }
    
    // Hash the admin password
    const hashedPassword = await hashPassword('admin123');
    
    // Create the admin user with simpler SQL
    const insertQuery = "INSERT INTO admins (username, password, email, phone, display_name, access_level, role, is_active) VALUES ('admin', '" + hashedPassword + "', 'admin@example.com', '1234567890', 'System Admin', 'admin', 'admin', true) ON CONFLICT (username) DO NOTHING RETURNING id, username";
    
    const { data, error } = await supabase.rpc('run_sql', { sql_query: insertQuery });
    
    if (error) {
      console.error(`❌ Error creating admin user: ${error.message}`);
      
      // Try direct insert via Supabase API as a fallback
      console.log('Attempting direct insert via Supabase API...');
      const { data: directData, error: directError } = await supabase
        .from('admins')
        .insert({
          username: 'admin',
          password: hashedPassword,
          email: 'admin@example.com',
          phone: '1234567890',
          display_name: 'System Admin',
          access_level: 'admin',
          role: 'admin',
          is_active: true
        })
        .select('id, username')
        .single();
      
      if (directError) {
        console.error(`❌ Direct insert also failed: ${directError.message}`);
      } else if (directData) {
        console.log(`✅ Admin user created via direct insert (ID: ${directData.id})`);
        console.log(`✅ Username: admin, Password: admin123`);
      }
    } else if (data && data.length > 0) {
      console.log(`✅ Admin user created successfully via SQL (ID: ${data[0].id})`);
      console.log(`✅ Username: admin, Password: admin123`);
    } else {
      console.log(`ℹ️ Admin user was not created (may already exist)`);
    }
  } catch (err) {
    console.error(`❌ Exception creating admin user: ${err.message}`);
  }
}

// Function to verify tables exist
async function verifyTables() {
  console.log('🔵 Verifying tables...');
  
  const tables = [
    'users', 'teams', 'team_members', 'tournaments', 
    'registrations', 'notifications', 'notification_reads', 'admins'
  ];
  
  for (const table of tables) {
    try {
      // Simple check if table exists by trying to select a row
      const { data, error } = await supabase
        .from(table)
        .select('count(*)', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ Table '${table}' check failed: ${error.message}`);
      } else {
        console.log(`✅ Table '${table}' exists`);
      }
    } catch (err) {
      console.error(`❌ Exception checking table '${table}': ${err.message}`);
    }
  }
}

// Main function
async function main() {
  console.log('==============================================');
  console.log('🚀 Starting Supabase Database Setup');
  console.log('==============================================');
  
  try {
    // Check if run_sql function exists
    console.log('🔵 Testing run_sql function...');
    const { data, error } = await supabase.rpc('run_sql', {
      sql_query: 'SELECT current_timestamp as time'
    });
    
    if (error) {
      console.error(`❌ run_sql function test failed: ${error.message}`);
      console.log('\nPlease create the run_sql function in Supabase SQL Editor first using:');
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
      process.exit(1);
    }
    
    console.log('✅ run_sql function is working');
    
    // Create tables
    await createTables();
    
    // Create admin user
    await createAdminUser();
    
    // Verify tables
    await verifyTables();
    
    console.log('==============================================');
    console.log('✅ Database setup completed!');
    console.log('==============================================');
    console.log('Admin login credentials:');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('==============================================');
  } catch (err) {
    console.error(`❌ Unhandled error: ${err.message}`);
    process.exit(1);
  }
}

// Run the main function
main();