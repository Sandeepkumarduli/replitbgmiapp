-- Insert admin user with a default password (will need to be changed later)
-- Note: In a real production environment, use a proper password hashing mechanism
-- This is just for initial setup
INSERT INTO admins (
  username, 
  password, 
  email, 
  phone, 
  display_name, 
  access_level,
  role,
  is_active
) 
VALUES (
  'admin',
  -- This is a placeholder password, it needs to be replaced with a properly hashed password
  -- The JavaScript setup script will generate a proper bcrypt hash
  'PLACEHOLDER_PASSWORD',
  'admin@example.com',
  '1234567890',
  'System Admin',
  'admin',
  'admin',
  true
)
ON CONFLICT (username) DO NOTHING
RETURNING id, username, email, role;