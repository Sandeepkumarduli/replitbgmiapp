// This script helps initialize Supabase tables based on our schema
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if credentials are available
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env file.');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function createTables() {
  try {
    console.log('Starting Supabase table creation...');

    // Create users table if it doesn't exist
    console.log('Creating users table...');
    await supabase.rpc('create_table_if_not_exists', {
      table_name: 'users',
      table_definition: `
        id bigserial PRIMARY KEY,
        username text UNIQUE NOT NULL,
        password text NOT NULL,
        email text UNIQUE NOT NULL,
        phone text NOT NULL,
        gameId text NOT NULL,
        role text NOT NULL DEFAULT 'user',
        createdAt timestamp with time zone DEFAULT timezone('utc'::text, now())
      `
    });

    // Create teams table
    console.log('Creating teams table...');
    await supabase.rpc('create_table_if_not_exists', {
      table_name: 'teams',
      table_definition: `
        id bigserial PRIMARY KEY,
        name text UNIQUE NOT NULL,
        ownerId bigint REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        createdAt timestamp with time zone DEFAULT timezone('utc'::text, now())
      `
    });

    // Create team_members table
    console.log('Creating team_members table...');
    await supabase.rpc('create_table_if_not_exists', {
      table_name: 'team_members',
      table_definition: `
        id bigserial PRIMARY KEY,
        teamId bigint REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
        playerName text NOT NULL,
        gameId text NOT NULL,
        createdAt timestamp with time zone DEFAULT timezone('utc'::text, now())
      `
    });

    // Create tournaments table
    console.log('Creating tournaments table...');
    await supabase.rpc('create_table_if_not_exists', {
      table_name: 'tournaments',
      table_definition: `
        id bigserial PRIMARY KEY,
        title text NOT NULL,
        description text NOT NULL,
        date timestamp with time zone NOT NULL,
        mapType text NOT NULL,
        teamType text NOT NULL,
        entryFee integer NOT NULL DEFAULT 0,
        prizePool integer NOT NULL DEFAULT 0,
        totalSlots integer NOT NULL,
        filledSlots integer NOT NULL DEFAULT 0,
        status text NOT NULL DEFAULT 'upcoming',
        roomId text,
        password text,
        createdAt timestamp with time zone DEFAULT timezone('utc'::text, now()),
        isPaid boolean NOT NULL DEFAULT false
      `
    });

    // Create registrations table
    console.log('Creating registrations table...');
    await supabase.rpc('create_table_if_not_exists', {
      table_name: 'registrations',
      table_definition: `
        id bigserial PRIMARY KEY,
        userId bigint REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        teamId bigint REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
        tournamentId bigint REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
        slot integer NOT NULL,
        registeredAt timestamp with time zone DEFAULT timezone('utc'::text, now()),
        UNIQUE(tournamentId, teamId)
      `
    });

    console.log('All tables created successfully!');
  } catch (error) {
    console.error('Error creating tables:', error);
    process.exit(1);
  }
}

// Run the script
createTables();