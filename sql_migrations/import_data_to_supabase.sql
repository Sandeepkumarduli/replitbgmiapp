-- This SQL script imports data into Supabase tables
-- Replace the VALUES sections with actual data from your PostgreSQL export

-- Import admin user data (if not already created by the setup script)
INSERT INTO profiles (id, username, password, email, phone, phone_verified, phone_verification_bypassed, firebase_uid, game_id, role, created_at)
VALUES 
  (1, 'Sandeepkumarduli', '40dcd42ce8efdfc35110f24673ee3f72feaed5e014753c5b12fda9986edfd7a834e1c73ef630b51eef5ba968dd6f6809190f330b83932540d44b5c3ff6604032.8b1c980ebbae53b9903dff04a473408e', 'admin@bgmi-tournaments.com', '1234567890', TRUE, TRUE, NULL, 'admin', 'admin', '2025-05-01 21:26:49.919517')
ON CONFLICT (id) DO NOTHING;

-- Reset the sequence for profiles (adjust max_id as needed)
SELECT setval('profiles_id_seq', (SELECT COALESCE(MAX(id), 0) FROM profiles), true);

-- Import tournament data
INSERT INTO tournaments (id, title, description, date, map_type, game_mode, team_type, game_type, is_paid, entry_fee, prize_pool, total_slots, slots, room_id, password, status, created_by, created_at)
VALUES
  (16, 'Erangel - Solo', 'Foxys match', '2025-05-04 18:30:00', 'Erangel', 'Squad', 'Solo', 'BGMI', FALSE, 0, 1000, 100, 100, '4562132', '1235', 'upcoming', 1, '2025-05-03 12:36:41.250616')
ON CONFLICT (id) DO NOTHING;

-- Reset the sequence for tournaments
SELECT setval('tournaments_id_seq', (SELECT COALESCE(MAX(id), 0) FROM tournaments), true);

-- Import teams data (uncomment and fill with actual data)
/*
INSERT INTO teams (id, name, owner_id, game_type, invite_code, created_at)
VALUES
  (1, 'Team Name 1', 1, 'BGMI', 'ABC123', '2025-05-01 12:00:00')
ON CONFLICT (id) DO NOTHING;

-- Reset the sequence for teams
SELECT setval('teams_id_seq', (SELECT COALESCE(MAX(id), 0) FROM teams), true);
*/

-- Import team_members data (uncomment and fill with actual data)
/*
INSERT INTO team_members (id, team_id, username, game_id, role, created_at)
VALUES
  (1, 1, 'Member1', 'GAME001', 'captain', '2025-05-01 12:30:00')
ON CONFLICT (id) DO NOTHING;

-- Reset the sequence for team_members
SELECT setval('team_members_id_seq', (SELECT COALESCE(MAX(id), 0) FROM team_members), true);
*/

-- Import registrations data (uncomment and fill with actual data)
/*
INSERT INTO registrations (id, tournament_id, team_id, user_id, slot, registered_at)
VALUES
  (1, 16, 1, 1, 1, '2025-05-03 14:00:00')
ON CONFLICT (id) DO NOTHING;

-- Reset the sequence for registrations
SELECT setval('registrations_id_seq', (SELECT COALESCE(MAX(id), 0) FROM registrations), true);
*/

-- Import notifications data (uncomment and fill with actual data)
/*
INSERT INTO notifications (id, user_id, title, message, type, related_id, is_read, created_at)
VALUES
  (1, 1, 'Welcome', 'Welcome to RD Tournaments', 'general', NULL, FALSE, '2025-05-01 12:00:00')
ON CONFLICT (id) DO NOTHING;

-- Reset the sequence for notifications
SELECT setval('notifications_id_seq', (SELECT COALESCE(MAX(id), 0) FROM notifications), true);
*/

-- Import notification_reads data (uncomment and fill with actual data)
/*
INSERT INTO notification_reads (id, user_id, notification_id, created_at)
VALUES
  (1, 1, 1, '2025-05-01 13:00:00')
ON CONFLICT (id) DO NOTHING;

-- Reset the sequence for notification_reads
SELECT setval('notification_reads_id_seq', (SELECT COALESCE(MAX(id), 0) FROM notification_reads), true);
*/