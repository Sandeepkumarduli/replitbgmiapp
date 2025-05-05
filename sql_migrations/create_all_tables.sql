-- Table creation SQL for Supabase
-- This script will create all required tables for the RD TOURNAMENTS HUB application
-- Copy this SQL into the Supabase SQL Editor and execute

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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  game_type TEXT NOT NULL DEFAULT 'BGMI',
  invite_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id),
  username TEXT NOT NULL,
  game_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  map_type TEXT NOT NULL,
  game_mode TEXT NOT NULL DEFAULT 'Squad',
  team_type TEXT NOT NULL,
  game_type TEXT NOT NULL DEFAULT 'BGMI',
  is_paid BOOLEAN NOT NULL DEFAULT false,
  entry_fee INTEGER DEFAULT 0,
  prize_pool INTEGER DEFAULT 0,
  total_slots INTEGER NOT NULL,
  slots INTEGER NOT NULL,
  room_id TEXT,
  password TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming',
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create registrations table
CREATE TABLE IF NOT EXISTS registrations (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id),
  team_id INTEGER NOT NULL REFERENCES teams(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  slot INTEGER,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tournament_id, user_id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  related_id INTEGER,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create notification_reads table
CREATE TABLE IF NOT EXISTS notification_reads (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  notification_id INTEGER NOT NULL REFERENCES notifications(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, notification_id)
);

-- Insert hardcoded admin user
-- Password hash for "Sandy@1234"
INSERT INTO users (username, password, email, phone, role, game_id, phone_verified, phone_verification_bypassed)
VALUES (
  'Sandeepkumarduli', 
  '$2b$10$xK4NRNmAWGIyvvLKsv4P6eZA.MkYcQXX.YJFZkqTMjvuEUHHxfVOm', 
  'admin@bgmi-tournaments.com', 
  '1234567890', 
  'admin', 
  'admin', 
  true, 
  true
)
ON CONFLICT (username) DO NOTHING;

-- Enable Row Level Security for all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;

-- Create Row Level Security policies
-- These policies determine who can read/write to each table
-- For users table
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid()::text = firebase_uid OR role = 'admin');
  
CREATE POLICY "Admin can manage all users" ON users
  FOR ALL USING (role = 'admin');

-- For teams table
CREATE POLICY "Anyone can view teams" ON teams
  FOR SELECT USING (true);
  
CREATE POLICY "Only team owner can modify" ON teams
  FOR ALL USING (owner_id = (SELECT id FROM users WHERE firebase_uid = auth.uid()::text) OR 
                (SELECT role FROM users WHERE firebase_uid = auth.uid()::text) = 'admin');

-- For tournaments table
CREATE POLICY "Anyone can view tournaments" ON tournaments
  FOR SELECT USING (true);
  
CREATE POLICY "Only admin can manage tournaments" ON tournaments
  FOR ALL USING ((SELECT role FROM users WHERE firebase_uid = auth.uid()::text) = 'admin');

-- Notify the client that the tables are ready
SELECT 'All tables created successfully! RD TOURNAMENTS HUB is ready to use.' as status;