# RD TOURNAMENTS HUB: Supabase Database Setup Guide

## Overview

This guide will walk you through setting up the necessary database tables in Supabase for the RD TOURNAMENTS HUB application. Supabase is used as the exclusive database for this application as per the requirements.

## Prerequisites

1. A Supabase account
2. A Supabase project created
3. Access to the Supabase dashboard for your project

## Step 1: Access the SQL Editor

1. Log in to your Supabase dashboard at https://app.supabase.com
2. Select your project
3. In the left sidebar, click on **SQL Editor**
4. Click the **New Query** button

## Step 2: Create the Database Tables

Copy and paste the following SQL into the SQL Editor:

```sql
-- Table creation SQL for Supabase
-- This script will create all required tables for the RD TOURNAMENTS HUB application

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
```

After pasting the SQL, click the **Run** button to execute it.

## Step 3: Verify Table Creation

1. In the Supabase dashboard, navigate to the **Table Editor** in the left sidebar
2. You should see all the following tables listed:
   - users
   - teams
   - team_members
   - tournaments
   - registrations
   - notifications
   - notification_reads

3. Click on the "users" table to verify that the admin user was created with:
   - Username: Sandeepkumarduli
   - Role: admin

## Step 4: Set Up Row Level Security (Optional)

If you want to add security policies to restrict access to your data, you can run this additional SQL:

```sql
-- Enable Row Level Security for all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;

-- Create Row Level Security policies
-- For users table
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid()::text = firebase_uid OR role = 'admin');
  
CREATE POLICY "Admin can manage all users" ON users
  FOR ALL USING (role = 'admin');

-- For teams table
CREATE POLICY "Anyone can view teams" ON teams
  FOR SELECT USING (true);
  
CREATE POLICY "Only team owner can modify" ON teams
  FOR ALL USING (owner_id = (SELECT id FROM users WHERE firebase_uid = auth.uid()::text));

-- For tournaments table
CREATE POLICY "Anyone can view tournaments" ON tournaments
  FOR SELECT USING (true);
  
CREATE POLICY "Only admin can manage tournaments" ON tournaments
  FOR ALL USING ((SELECT role FROM users WHERE firebase_uid = auth.uid()::text) = 'admin');
```

## Step 5: Test the Application

1. After the database setup is complete, restart the application
2. The application should now be able to connect to Supabase and access the tables
3. You should be able to log in with the admin credentials:
   - Username: Sandeepkumarduli
   - Password: Sandy@1234

## Troubleshooting

If you encounter issues with the database setup:

1. **Table creation errors**: Check for any error messages in the SQL Editor when running the queries

2. **Connection issues**: Verify that your application has the correct environment variables set:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Login issues**: If you can't log in with the admin credentials, you may need to manually create or update the admin user through the Supabase Table Editor

4. **Missing tables**: If any tables are missing, you can run the relevant CREATE TABLE statements individually

## Additional Resources

- [Supabase Documentation](https://supabase.io/docs)
- [SQL Introduction](https://supabase.io/docs/guides/database/introduction)
- [Row Level Security Guide](https://supabase.io/docs/guides/auth/row-level-security)