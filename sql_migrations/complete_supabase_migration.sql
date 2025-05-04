-- COMPLETE SUPABASE MIGRATION SCRIPT
-- This script will:
-- 1. Remove existing tables in Supabase
-- 2. Create all required tables with proper structure
-- 3. Import existing data from PostgreSQL

-- First, drop existing tables if they already exist
DROP TABLE IF EXISTS "registrations" CASCADE;
DROP TABLE IF EXISTS "tournaments" CASCADE;
DROP TABLE IF EXISTS "profiles" CASCADE;
DROP TABLE IF EXISTS "notification_reads" CASCADE;
DROP TABLE IF EXISTS "notifications" CASCADE;
DROP TABLE IF EXISTS "team_members" CASCADE;
DROP TABLE IF EXISTS "teams" CASCADE;

-- Now create all tables with proper relationships

-- 1. Create profiles table (equivalent to users in our schema)
CREATE TABLE IF NOT EXISTS "profiles" (
  "id" SERIAL PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "phone" TEXT NOT NULL UNIQUE,
  "phone_verified" BOOLEAN NOT NULL DEFAULT FALSE,
  "phone_verification_bypassed" BOOLEAN NOT NULL DEFAULT FALSE,
  "firebase_uid" TEXT,
  "game_id" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'user',
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create teams table
CREATE TABLE IF NOT EXISTS "teams" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "owner_id" INTEGER NOT NULL REFERENCES "profiles"("id"),
  "game_type" TEXT NOT NULL DEFAULT 'BGMI',
  "invite_code" TEXT NOT NULL UNIQUE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create team_members table
CREATE TABLE IF NOT EXISTS "team_members" (
  "id" SERIAL PRIMARY KEY,
  "team_id" INTEGER NOT NULL REFERENCES "teams"("id"),
  "username" TEXT NOT NULL,
  "game_id" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create tournaments table
CREATE TABLE IF NOT EXISTS "tournaments" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "date" TIMESTAMP WITH TIME ZONE NOT NULL,
  "map_type" TEXT NOT NULL,
  "game_mode" TEXT NOT NULL DEFAULT 'Squad',
  "team_type" TEXT NOT NULL,
  "game_type" TEXT NOT NULL DEFAULT 'BGMI',
  "is_paid" BOOLEAN NOT NULL,
  "entry_fee" INTEGER DEFAULT 0,
  "prize_pool" INTEGER DEFAULT 0,
  "total_slots" INTEGER NOT NULL,
  "slots" INTEGER NOT NULL DEFAULT 100,
  "room_id" TEXT,
  "password" TEXT,
  "status" TEXT NOT NULL DEFAULT 'upcoming',
  "created_by" INTEGER NOT NULL REFERENCES "profiles"("id"),
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create registrations table
CREATE TABLE IF NOT EXISTS "registrations" (
  "id" SERIAL PRIMARY KEY,
  "tournament_id" INTEGER NOT NULL REFERENCES "tournaments"("id"),
  "team_id" INTEGER NOT NULL REFERENCES "teams"("id"),
  "user_id" INTEGER NOT NULL REFERENCES "profiles"("id"),
  "slot" INTEGER,
  "registered_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER REFERENCES "profiles"("id"),
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'general',
  "related_id" INTEGER,
  "is_read" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create notification_reads table
CREATE TABLE IF NOT EXISTS "notification_reads" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "profiles"("id"),
  "notification_id" INTEGER NOT NULL REFERENCES "notifications"("id"),
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT "user_notification_unique" UNIQUE ("user_id", "notification_id")
);

-- IMPORT DATA

-- 1. Import Admin User
INSERT INTO profiles (id, username, password, email, phone, phone_verified, phone_verification_bypassed, firebase_uid, game_id, role, created_at)
VALUES 
  (1, 'Sandeepkumarduli', '40dcd42ce8efdfc35110f24673ee3f72feaed5e014753c5b12fda9986edfd7a834e1c73ef630b51eef5ba968dd6f6809190f330b83932540d44b5c3ff6604032.8b1c980ebbae53b9903dff04a473408e', 'admin@bgmi-tournaments.com', '1234567890', TRUE, TRUE, NULL, 'admin', 'admin', '2025-05-01 21:26:49.919517')
ON CONFLICT (id) DO NOTHING;

-- Reset the sequence for profiles
SELECT setval('profiles_id_seq', (SELECT COALESCE(MAX(id), 0) FROM profiles), true);

-- 2. Import Tournament
INSERT INTO tournaments (id, title, description, date, map_type, game_mode, team_type, game_type, is_paid, entry_fee, prize_pool, total_slots, slots, room_id, password, status, created_by, created_at)
VALUES
  (16, 'Erangel - Solo', 'Foxys match', '2025-05-04 18:30:00', 'Erangel', 'Squad', 'Solo', 'BGMI', FALSE, 0, 1000, 100, 100, '4562132', '1235', 'upcoming', 1, '2025-05-03 12:36:41.250616')
ON CONFLICT (id) DO NOTHING;

-- Reset the sequence for tournaments
SELECT setval('tournaments_id_seq', (SELECT COALESCE(MAX(id), 0) FROM tournaments), true);

-- 3. Import Notifications
INSERT INTO notifications (id, user_id, title, message, type, related_id, is_read, created_at)
VALUES
  (8, NULL, 'Attention !', 'Welcome Back', 'broadcast', NULL, TRUE, '2025-05-03 22:23:37.250213'),
  (9, NULL, 'Attention !', 'Welcome Backk
', 'broadcast', NULL, TRUE, '2025-05-03 22:34:15.305854'),
  (10, NULL, 'Attention !', 'Heloooo', 'broadcast', NULL, TRUE, '2025-05-03 22:38:36.924895'),
  (11, NULL, 'Attention !', 'Hello', 'broadcast', NULL, TRUE, '2025-05-03 22:43:45.028008'),
  (12, NULL, 'Hello', 'Hello', 'broadcast', NULL, TRUE, '2025-05-03 22:56:18.016514'),
  (13, NULL, 'Hello', 'Hello Everyone', 'broadcast', NULL, FALSE, '2025-05-03 23:08:38.441239')
ON CONFLICT (id) DO NOTHING;

-- Reset the sequence for notifications
SELECT setval('notifications_id_seq', (SELECT COALESCE(MAX(id), 0) FROM notifications), true);

-- SETUP RLS POLICIES

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;

-- Create policies
-- For profiles table
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);
  
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
  
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id::text)
  WITH CHECK (auth.uid() = id::text);

-- For tournaments table (viewable by everyone)
CREATE POLICY "Tournaments are viewable by everyone"
  ON tournaments FOR SELECT
  USING (true);
  
CREATE POLICY "Only admins can insert tournaments"
  ON tournaments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()::int
      AND profiles.role = 'admin'
    )
  );
  
CREATE POLICY "Only admins can update tournaments"
  ON tournaments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()::int
      AND profiles.role = 'admin'
    )
  );

-- For notifications (broadcasts viewable by everyone)
CREATE POLICY "Public notifications are viewable by everyone"
  ON notifications FOR SELECT
  USING (user_id IS NULL OR user_id = auth.uid()::int);

-- Complete setup message
DO $$
BEGIN
  RAISE NOTICE 'Migration complete. Tables created and data imported successfully.';
END $$;