/**
 * This script sets up the necessary tables in Supabase
 * Run this script to create the required tables in your Supabase project
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Missing Supabase credentials');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your environment');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// SQL statements to create tables
const createTablesSql = {
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      game_id TEXT NOT NULL,
      phone_verified BOOLEAN NOT NULL DEFAULT false,
      phone_verification_bypassed BOOLEAN NOT NULL DEFAULT false,
      firebase_uid TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `,
  teams: `
    CREATE TABLE IF NOT EXISTS teams (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      owner_id INTEGER NOT NULL REFERENCES users(id),
      game_type TEXT NOT NULL,
      invite_code TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `,
  team_members: `
    CREATE TABLE IF NOT EXISTS team_members (
      id SERIAL PRIMARY KEY,
      team_id INTEGER NOT NULL REFERENCES teams(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      role TEXT NOT NULL DEFAULT 'member',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(team_id, user_id)
    );
  `,
  tournaments: `
    CREATE TABLE IF NOT EXISTS tournaments (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      date TIMESTAMP WITH TIME ZONE NOT NULL,
      game_type TEXT NOT NULL,
      map_type TEXT NOT NULL,
      game_mode TEXT NOT NULL,
      team_type TEXT NOT NULL,
      entry_fee NUMERIC NOT NULL DEFAULT 0,
      prize_pool NUMERIC NOT NULL DEFAULT 0,
      is_paid BOOLEAN NOT NULL DEFAULT false,
      total_slots INTEGER NOT NULL,
      slots INTEGER NOT NULL,
      created_by INTEGER NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'upcoming',
      password TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `,
  registrations: `
    CREATE TABLE IF NOT EXISTS registrations (
      id SERIAL PRIMARY KEY,
      tournament_id INTEGER NOT NULL REFERENCES tournaments(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      team_id INTEGER REFERENCES teams(id),
      status TEXT NOT NULL DEFAULT 'pending',
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tournament_id, user_id)
    );
  `,
  notifications: `
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      user_id INTEGER REFERENCES users(id),
      related_id INTEGER,
      is_read BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `,
  notification_reads: `
    CREATE TABLE IF NOT EXISTS notification_reads (
      id SERIAL PRIMARY KEY,
      notification_id INTEGER NOT NULL REFERENCES notifications(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(notification_id, user_id)
    );
  `
};

/**
 * Create tables in Supabase
 */
async function createTables() {
  console.log('Creating tables in Supabase...');
  
  for (const [tableName, sql] of Object.entries(createTablesSql)) {
    try {
      // Using the SQL API to create tables
      console.log(`Creating table: ${tableName}`);
      const { error } = await supabase.rpc('execute_sql', { 
        query: sql 
      });
      
      if (error) {
        console.error(`Error creating table ${tableName}:`, error);
      } else {
        console.log(`Table ${tableName} created or already exists`);
      }
    } catch (err) {
      console.error(`Error executing SQL for table ${tableName}:`, err);
    }
  }
}

// Create admin user function
async function createAdminUser() {
  console.log('Creating admin user...');
  
  const adminUser = {
    username: 'Sandeepkumarduli',
    password: '$2b$10$xK4NRNmAWGIyvvLKsv4P6eZA.MkYcQXX.YJFZkqTMjvuEUHHxfVOm', // Hash for Sandy@1234
    email: 'admin@bgmi-tournaments.com',
    phone: '1234567890',
    role: 'admin',
    game_id: 'admin',
    phone_verified: true,
    phone_verification_bypassed: true
  };
  
  try {
    // Check if admin user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('username', adminUser.username)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking for existing admin user:', checkError);
      return;
    }
    
    if (existingUser) {
      console.log('Admin user already exists');
      return;
    }
    
    // Create admin user
    const { data, error } = await supabase
      .from('users')
      .insert([adminUser])
      .select();
    
    if (error) {
      console.error('Error creating admin user:', error);
    } else {
      console.log('Admin user created successfully:', data[0].username);
    }
  } catch (err) {
    console.error('Error in createAdminUser:', err);
  }
}

// Main function
async function main() {
  try {
    await createTables();
    await createAdminUser();
    console.log('Database setup complete!');
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

// Run the script
main().catch(console.error);