-- This SQL script cleans up existing tables and creates all necessary tables in Supabase
-- Run this in the Supabase SQL Editor

-- First, drop existing tables if they already exist
DROP TABLE IF EXISTS "registrations" CASCADE;
DROP TABLE IF EXISTS "tournaments" CASCADE;
DROP TABLE IF EXISTS "profiles" CASCADE;

-- Now create all tables with proper relationships

-- Create profiles table (equivalent to users in our schema)
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
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Create teams table
CREATE TABLE IF NOT EXISTS "teams" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "owner_id" INTEGER NOT NULL REFERENCES "profiles"("id"),
  "game_type" TEXT NOT NULL DEFAULT 'BGMI',
  "invite_code" TEXT NOT NULL UNIQUE,
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS "team_members" (
  "id" SERIAL PRIMARY KEY,
  "team_id" INTEGER NOT NULL REFERENCES "teams"("id"),
  "username" TEXT NOT NULL,
  "game_id" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Create tournaments table
CREATE TABLE IF NOT EXISTS "tournaments" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "date" TIMESTAMP NOT NULL,
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
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Create registrations table
CREATE TABLE IF NOT EXISTS "registrations" (
  "id" SERIAL PRIMARY KEY,
  "tournament_id" INTEGER NOT NULL REFERENCES "tournaments"("id"),
  "team_id" INTEGER NOT NULL REFERENCES "teams"("id"),
  "user_id" INTEGER NOT NULL REFERENCES "profiles"("id"),
  "slot" INTEGER,
  "registered_at" TIMESTAMP DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER REFERENCES "profiles"("id"),
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'general',
  "related_id" INTEGER,
  "is_read" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Create notification_reads table
CREATE TABLE IF NOT EXISTS "notification_reads" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "profiles"("id"),
  "notification_id" INTEGER NOT NULL REFERENCES "notifications"("id"),
  "created_at" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT "user_notification_unique" UNIQUE ("user_id", "notification_id")
);

-- Create admin user if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE username = 'Sandeepkumarduli') THEN
    INSERT INTO profiles (username, password, email, phone, game_id, role, phone_verified, phone_verification_bypassed)
    VALUES (
      'Sandeepkumarduli',
      '40dcd42ce8efdfc35110f24673ee3f72feaed5e014753c5b12fda9986edfd7a834e1c73ef630b51eef5ba968dd6f6809190f330b83932540d44b5c3ff6604032.8b1c980ebbae53b9903dff04a473408e',
      'admin@bgmi-tournaments.com',
      '1234567890',
      'admin',
      'admin',
      TRUE,
      TRUE
    );
  END IF;
END
$$;