/**
 * This script sets up the necessary tables in your Supabase project
 * Run this script after creating a new Supabase project to prepare it for the application
 * 
 * Usage: node scripts/setup-supabase.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Ensure Supabase credentials are available
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env file.');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function createTables() {
  try {
    console.log('Setting up Supabase tables...');
    
    // Create users table
    console.log('Creating users table...');
    const { error: usersError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'users',
      column_definitions: `
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT NOT NULL,
        gameId TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      `
    });
    
    if (usersError) {
      console.error('Error creating users table:', usersError);
    } else {
      console.log('Users table created successfully');
    }
    
    // Create teams table
    console.log('Creating teams table...');
    const { error: teamsError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'teams',
      column_definitions: `
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        logo TEXT,
        ownerId INTEGER NOT NULL REFERENCES users(id),
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      `
    });
    
    if (teamsError) {
      console.error('Error creating teams table:', teamsError);
    } else {
      console.log('Teams table created successfully');
    }
    
    // Create team_members table
    console.log('Creating team_members table...');
    const { error: teamMembersError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'team_members',
      column_definitions: `
        id SERIAL PRIMARY KEY,
        teamId INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        username TEXT NOT NULL,
        gameId TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member'
      `
    });
    
    if (teamMembersError) {
      console.error('Error creating team_members table:', teamMembersError);
    } else {
      console.log('Team members table created successfully');
    }
    
    // Create tournaments table
    console.log('Creating tournaments table...');
    const { error: tournamentsError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'tournaments',
      column_definitions: `
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        date TIMESTAMP WITH TIME ZONE NOT NULL,
        slots INTEGER NOT NULL,
        map TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'upcoming',
        entryFee NUMERIC,
        prizePool NUMERIC,
        image TEXT,
        createdBy INTEGER NOT NULL REFERENCES users(id),
        roomDetails JSONB,
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      `
    });
    
    if (tournamentsError) {
      console.error('Error creating tournaments table:', tournamentsError);
    } else {
      console.log('Tournaments table created successfully');
    }
    
    // Create registrations table
    console.log('Creating registrations table...');
    const { error: registrationsError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'registrations',
      column_definitions: `
        id SERIAL PRIMARY KEY,
        tournamentId INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        teamId INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        userId INTEGER NOT NULL REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'pending',
        slot INTEGER,
        registeredAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tournamentId, teamId)
      `
    });
    
    if (registrationsError) {
      console.error('Error creating registrations table:', registrationsError);
    } else {
      console.log('Registrations table created successfully');
    }
    
    // Create necessary indexes for performance
    console.log('Creating indexes...');
    
    // Index on teams.ownerId
    const { error: teamOwnerIdxError } = await supabase.rpc('execute_sql', {
      sql_query: 'CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON teams(ownerId)'
    });
    
    if (teamOwnerIdxError) {
      console.error('Error creating teams.ownerId index:', teamOwnerIdxError);
    }
    
    // Index on team_members.teamId
    const { error: teamMemberIdxError } = await supabase.rpc('execute_sql', {
      sql_query: 'CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(teamId)'
    });
    
    if (teamMemberIdxError) {
      console.error('Error creating team_members.teamId index:', teamMemberIdxError);
    }
    
    // Index on tournaments.status
    const { error: tournamentStatusIdxError } = await supabase.rpc('execute_sql', {
      sql_query: 'CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status)'
    });
    
    if (tournamentStatusIdxError) {
      console.error('Error creating tournaments.status index:', tournamentStatusIdxError);
    }
    
    // Indexes on registrations
    const { error: regTournamentIdxError } = await supabase.rpc('execute_sql', {
      sql_query: 'CREATE INDEX IF NOT EXISTS idx_registrations_tournament_id ON registrations(tournamentId)'
    });
    
    if (regTournamentIdxError) {
      console.error('Error creating registrations.tournamentId index:', regTournamentIdxError);
    }
    
    const { error: regTeamIdxError } = await supabase.rpc('execute_sql', {
      sql_query: 'CREATE INDEX IF NOT EXISTS idx_registrations_team_id ON registrations(teamId)'
    });
    
    if (regTeamIdxError) {
      console.error('Error creating registrations.teamId index:', regTeamIdxError);
    }
    
    const { error: regUserIdxError } = await supabase.rpc('execute_sql', {
      sql_query: 'CREATE INDEX IF NOT EXISTS idx_registrations_user_id ON registrations(userId)'
    });
    
    if (regUserIdxError) {
      console.error('Error creating registrations.userId index:', regUserIdxError);
    }
    
    // Create stored procedures for common operations
    console.log('Creating stored procedures...');
    
    // Procedure to get tournament registration counts
    const { error: procRegCountError } = await supabase.rpc('execute_sql', {
      sql_query: `
        CREATE OR REPLACE FUNCTION get_tournament_registration_counts()
        RETURNS TABLE(tournamentId INTEGER, registrationCount BIGINT) 
        LANGUAGE SQL
        AS $$
          SELECT tournamentId, COUNT(*) as registrationCount 
          FROM registrations 
          GROUP BY tournamentId;
        $$;
      `
    });
    
    if (procRegCountError) {
      console.error('Error creating get_tournament_registration_counts procedure:', procRegCountError);
    }
    
    console.log('Setup completed!');
    console.log('Your Supabase database is now ready to be used with the BGMI Tournament Platform.');
    
  } catch (error) {
    console.error('Error setting up Supabase:', error);
  }
}

createTables().catch(err => {
  console.error('Script execution failed:', err);
  process.exit(1);
});