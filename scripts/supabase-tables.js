/**
 * This file defines the tables and columns to be created in Supabase.
 * It can be used with scripts that create tables directly through the Supabase API.
 */

// Define the tables and their columns
export const tables = {
  users: {
    name: 'users',
    columns: [
      { name: 'id', type: 'serial', primaryKey: true },
      { name: 'username', type: 'text', notNull: true, unique: true },
      { name: 'password', type: 'text', notNull: true },
      { name: 'email', type: 'text', notNull: true, unique: true },
      { name: 'phone', type: 'text', notNull: true, unique: true },
      { name: 'phone_verified', type: 'boolean', notNull: true, default: false },
      { name: 'phone_verification_bypassed', type: 'boolean', notNull: true, default: true },
      { name: 'firebase_uid', type: 'text' },
      { name: 'game_id', type: 'text', notNull: true },
      { name: 'role', type: 'text', notNull: true, default: "'user'" },
      { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' }
    ]
  },
  teams: {
    name: 'teams',
    columns: [
      { name: 'id', type: 'serial', primaryKey: true },
      { name: 'name', type: 'text', notNull: true, unique: true },
      { name: 'owner_id', type: 'integer', notNull: true, references: 'users(id)' },
      { name: 'game_type', type: 'text', notNull: true, default: "'BGMI'" },
      { name: 'invite_code', type: 'text', notNull: true, unique: true },
      { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' }
    ]
  },
  team_members: {
    name: 'team_members',
    columns: [
      { name: 'id', type: 'serial', primaryKey: true },
      { name: 'team_id', type: 'integer', notNull: true, references: 'teams(id)' },
      { name: 'username', type: 'text', notNull: true },
      { name: 'game_id', type: 'text', notNull: true },
      { name: 'role', type: 'text', notNull: true, default: "'member'" },
      { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' }
    ]
  },
  tournaments: {
    name: 'tournaments',
    columns: [
      { name: 'id', type: 'serial', primaryKey: true },
      { name: 'title', type: 'text', notNull: true },
      { name: 'description', type: 'text', notNull: true },
      { name: 'date', type: 'timestamp', notNull: true },
      { name: 'map_type', type: 'text', notNull: true },
      { name: 'game_mode', type: 'text', notNull: true, default: "'Squad'" },
      { name: 'team_type', type: 'text', notNull: true },
      { name: 'game_type', type: 'text', notNull: true, default: "'BGMI'" },
      { name: 'is_paid', type: 'boolean', notNull: true },
      { name: 'entry_fee', type: 'integer', notNull: true, default: 0 },
      { name: 'prize_pool', type: 'integer', notNull: true, default: 0 },
      { name: 'total_slots', type: 'integer', notNull: true },
      { name: 'slots', type: 'integer', notNull: true },
      { name: 'room_id', type: 'text' },
      { name: 'password', type: 'text' },
      { name: 'banner_url', type: 'text' },
      { name: 'created_by', type: 'integer', notNull: true, references: 'users(id)' },
      { name: 'status', type: 'text', notNull: true, default: "'upcoming'" },
      { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' }
    ]
  },
  registrations: {
    name: 'registrations',
    columns: [
      { name: 'id', type: 'serial', primaryKey: true },
      { name: 'tournament_id', type: 'integer', notNull: true, references: 'tournaments(id)' },
      { name: 'team_id', type: 'integer', notNull: true, references: 'teams(id)' },
      { name: 'user_id', type: 'integer', notNull: true, references: 'users(id)' },
      { name: 'payment_status', type: 'text', notNull: true, default: "'pending'" },
      { name: 'payment_id', type: 'text' },
      { name: 'payment_amount', type: 'integer', notNull: true, default: 0 },
      { name: 'slot', type: 'integer' },
      { name: 'registered_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' }
    ],
    constraints: [
      { type: 'unique', columns: ['tournament_id', 'team_id'] }
    ]
  },
  notifications: {
    name: 'notifications',
    columns: [
      { name: 'id', type: 'serial', primaryKey: true },
      { name: 'title', type: 'text', notNull: true },
      { name: 'message', type: 'text', notNull: true },
      { name: 'type', type: 'text', notNull: true, default: "'info'" },
      { name: 'user_id', type: 'integer', references: 'users(id)' },
      { name: 'related_id', type: 'integer' },
      { name: 'is_read', type: 'boolean', notNull: true, default: false },
      { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' }
    ]
  },
  notification_reads: {
    name: 'notification_reads',
    columns: [
      { name: 'id', type: 'serial', primaryKey: true },
      { name: 'user_id', type: 'integer', notNull: true, references: 'users(id)' },
      { name: 'notification_id', type: 'integer', notNull: true, references: 'notifications(id)' },
      { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' }
    ],
    constraints: [
      { type: 'unique', columns: ['user_id', 'notification_id'] }
    ]
  },
  admins: {
    name: 'admins',
    columns: [
      { name: 'id', type: 'serial', primaryKey: true },
      { name: 'username', type: 'text', notNull: true, unique: true },
      { name: 'password', type: 'text', notNull: true },
      { name: 'email', type: 'text', notNull: true, unique: true },
      { name: 'phone', type: 'text', notNull: true },
      { name: 'display_name', type: 'text', notNull: true },
      { name: 'access_level', type: 'text', notNull: true, default: "'standard'" },
      { name: 'last_login', type: 'timestamp' },
      { name: 'is_active', type: 'boolean', notNull: true, default: true },
      { name: 'role', type: 'text', notNull: true, default: "'admin'" },
      { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' }
    ]
  }
};

// Function to generate CREATE TABLE SQL
export function generateCreateTableSQL(table) {
  const { name, columns, constraints = [] } = table;
  
  // Generate column definitions
  const columnDefs = columns.map(col => {
    let def = `${col.name} ${col.type}`;
    
    if (col.primaryKey) {
      def += ' PRIMARY KEY';
    }
    
    if (col.notNull) {
      def += ' NOT NULL';
    }
    
    if (col.unique) {
      def += ' UNIQUE';
    }
    
    if (col.default !== undefined) {
      def += ` DEFAULT ${col.default}`;
    }
    
    if (col.references) {
      def += ` REFERENCES ${col.references}`;
    }
    
    return def;
  });
  
  // Generate constraint definitions
  const constraintDefs = constraints.map(constraint => {
    if (constraint.type === 'unique') {
      return `UNIQUE(${constraint.columns.join(', ')})`;
    }
    return '';
  }).filter(def => def !== '');
  
  // Combine column and constraint definitions
  const allDefs = [...columnDefs, ...constraintDefs];
  
  // Generate complete CREATE TABLE statement
  return `CREATE TABLE IF NOT EXISTS ${name} (
  ${allDefs.join(',\n  ')}
)`;
}

// Helper function to simplify SQL without breaking it
export function simplifySQL(sql) {
  return sql
    .replace(/\s+/g, ' ')
    .trim();
}

// Generate SQL for all tables
export function generateAllTableSQL() {
  return Object.values(tables).map(table => 
    generateCreateTableSQL(table)
  );
}

// Examples of SQL for manual execution in Supabase SQL Editor
export const sqlExamples = {
  createRunSqlFunction: `
DROP FUNCTION IF EXISTS public.run_sql(text);

CREATE OR REPLACE FUNCTION public.run_sql(sql_query TEXT) 
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || sql_query || ') AS t' INTO result;
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$;
  `,
  
  createTablesDirectly: `
-- Create all tables directly using SQL
-- Copy and run this in the Supabase SQL Editor

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL UNIQUE,
  phone_verified BOOLEAN NOT NULL DEFAULT false,
  phone_verification_bypassed BOOLEAN NOT NULL DEFAULT true,
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
  `
};