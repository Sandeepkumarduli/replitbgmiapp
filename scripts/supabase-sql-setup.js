/**
 * This script generates SQL statements for setting up the database in Supabase
 * 
 * To use this script:
 * 1. Run it with: node scripts/supabase-sql-setup.js
 * 2. Copy the generated SQL
 * 3. Paste it into the SQL Editor in the Supabase Dashboard
 * 4. Execute the SQL statements
 */

import fs from 'fs';

// Generate SQL statements for creating tables
function generateTableSQL() {
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

-- Create stored procedure for running SQL
CREATE OR REPLACE FUNCTION public.run_sql(sql_query TEXT) 
RETURNS SETOF json AS $$
BEGIN
    RETURN QUERY EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create stored procedure for executing SQL with results
CREATE OR REPLACE FUNCTION execute_sql(query TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  EXECUTE query INTO result;
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a test admin account
INSERT INTO users (username, password, email, phone, game_id, role, phone_verified, phone_verification_bypassed)
VALUES 
(
  'Sandeepkumarduli', 
  -- Using a pre-hashed password for 'Sandy@1234'
  '9af15b336e6a9619928537df30b2e6a2376569fcf9d7e773eccede65606529a0.7e05e36ad9eb70fd1e48c2b90ab3276c', 
  'admin@bgmi-tournaments.com', 
  '1234567890',
  'admin123',
  'admin',
  TRUE,
  TRUE
)
ON CONFLICT (username) DO
UPDATE SET 
  role = 'admin',
  phone_verified = TRUE,
  phone_verification_bypassed = TRUE;
`;

  return sql;
}

// Generate SQL for RLS policies
function generateRLSPolicies() {
  const sql = `
-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view their own data" 
  ON users FOR SELECT 
  USING (auth.uid() = firebase_uid OR role = 'admin');

-- Create policies for teams table
CREATE POLICY "Users can view all teams" 
  ON teams FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Users can create teams" 
  ON teams FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Team owners can update their teams" 
  ON teams FOR UPDATE 
  TO authenticated 
  USING (auth.uid() IN (SELECT firebase_uid FROM users WHERE id = owner_id));

-- Similar policies for other tables...
-- ...

-- Grant access to authenticated users for all tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE, DELETE ON users, teams, team_members, tournaments, 
  registrations, notifications, notification_reads TO authenticated;
`;

  return sql;
}

// Main function
function main() {
  console.log('Generating SQL for Supabase setup...');
  
  const tableSQL = generateTableSQL();
  const rlsSQL = generateRLSPolicies();
  
  console.log('\n===== SUPABASE SETUP SQL =====');
  console.log(tableSQL);
  console.log('\n===== RLS POLICIES SQL (OPTIONAL) =====');
  console.log(rlsSQL);
  
  // Save to file for convenience
  fs.writeFileSync('supabase-setup.sql', tableSQL);
  fs.writeFileSync('supabase-rls.sql', rlsSQL);
  
  console.log('\nSQL scripts have been saved to:');
  console.log('- supabase-setup.sql (Required tables creation)');
  console.log('- supabase-rls.sql (Optional RLS policies)');
  console.log('\nCopy the content of these files and execute them in the Supabase SQL Editor.');
  console.log('After creating the tables, the application should be able to connect and work properly with Supabase.');
}

// Run the script
main();