-- Query to verify the Supabase database status

-- Check which tables exist
SELECT 
  table_name,
  'Table exists' as status
FROM 
  information_schema.tables
WHERE 
  table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY
  table_name;
  
-- Count records in each important table
SELECT 'profiles' as table_name, COUNT(*) as record_count FROM profiles
UNION
SELECT 'teams' as table_name, COUNT(*) as record_count FROM teams
UNION
SELECT 'team_members' as table_name, COUNT(*) as record_count FROM team_members
UNION
SELECT 'tournaments' as table_name, COUNT(*) as record_count FROM tournaments
UNION
SELECT 'registrations' as table_name, COUNT(*) as record_count FROM registrations
UNION
SELECT 'notifications' as table_name, COUNT(*) as record_count FROM notifications
UNION
SELECT 'notification_reads' as table_name, COUNT(*) as record_count FROM notification_reads
ORDER BY
  table_name;

-- Check for the admin user
SELECT 
  id, 
  username, 
  role, 
  phone, 
  phone_verified,
  substr(password, 1, 20) || '...' as password_partial
FROM 
  profiles 
WHERE 
  username = 'Sandeepkumarduli'
  AND role = 'admin';

-- Check for the Erangel tournament
SELECT 
  id,
  title,
  map_type,
  game_mode,
  team_type,
  status,
  date
FROM
  tournaments
WHERE
  title = 'Erangel - Solo';

-- Check for notifications
SELECT 
  id,
  title,
  substr(message, 1, 30) as message_preview,
  type,
  created_at
FROM
  notifications
ORDER BY
  created_at DESC
LIMIT 10;