-- This file contains SQL queries to export data from PostgreSQL
-- Run each query in your PostgreSQL database and save the results as CSV or JSON
-- Then import the data into Supabase tables

-- Export users (will be imported to profiles in Supabase)
SELECT id, username, password, email, phone, phone_verified, phone_verification_bypassed,
       firebase_uid, game_id, role, created_at
FROM users;

-- Export tournaments
SELECT id, title, description, date, map_type, game_mode, team_type, game_type,
       is_paid, entry_fee, prize_pool, total_slots, slots, room_id, password,
       status, created_by, created_at
FROM tournaments;

-- Export teams
SELECT id, name, owner_id, game_type, invite_code, created_at
FROM teams;

-- Export team_members
SELECT id, team_id, username, game_id, role, created_at
FROM team_members;

-- Export registrations
SELECT id, tournament_id, team_id, user_id, slot, registered_at
FROM registrations;

-- Export notifications
SELECT id, user_id, title, message, type, related_id, is_read, created_at
FROM notifications;

-- Export notification_reads
SELECT id, user_id, notification_id, created_at
FROM notification_reads;