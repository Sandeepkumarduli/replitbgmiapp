
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
