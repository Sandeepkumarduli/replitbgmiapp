import { supabase } from './supabase';

/**
 * Creates all required tables in Supabase using the run_sql function
 * This should be run after the SQL functions have been created in the Supabase dashboard
 */
export async function createSupabaseTables() {
  console.log('Creating tables in Supabase...');

  try {
    // Create users table
    await executeTableCreation('users', `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT NOT NULL UNIQUE,
        phone_verified BOOLEAN NOT NULL DEFAULT false,
        phone_verification_bypassed BOOLEAN NOT NULL DEFAULT false,
        firebase_uid TEXT,
        game_id TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create teams table
    await executeTableCreation('teams', `
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        owner_id INTEGER NOT NULL REFERENCES users(id),
        game_type TEXT NOT NULL DEFAULT 'BGMI',
        invite_code TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create team_members table
    await executeTableCreation('team_members', `
      CREATE TABLE IF NOT EXISTS team_members (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL REFERENCES teams(id),
        username TEXT NOT NULL,
        game_id TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create tournaments table
    await executeTableCreation('tournaments', `
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
    `);

    // Create registrations table
    await executeTableCreation('registrations', `
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
    `);

    // Create notifications table
    await executeTableCreation('notifications', `
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
    `);

    // Create notification_reads table
    await executeTableCreation('notification_reads', `
      CREATE TABLE IF NOT EXISTS notification_reads (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        notification_id INTEGER NOT NULL REFERENCES notifications(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, notification_id)
      );
    `);

    // Create admins table
    await executeTableCreation('admins', `
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
    `);

    console.log('All tables created successfully!');
    return { success: true, message: 'All tables created successfully!' };
  } catch (error) {
    console.error('Error creating tables:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

async function executeTableCreation(tableName: string, sql: string) {
  try {
    console.log(`Creating table: ${tableName}`);
    
    // First check if the table already exists by trying to count rows
    const { error: checkError } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
    
    if (!checkError) {
      console.log(`Table '${tableName}' already exists, skipping creation`);
      return;
    }
    
    // If the table doesn't exist, use our run_sql function to create it
    const { data, error } = await supabase.rpc('run_sql', { 
      sql_query: sql 
    });
    
    if (error) {
      console.error(`Error creating table '${tableName}':`, error);
      throw error;
    }
    
    console.log(`Table '${tableName}' created successfully.`);
    return data;
  } catch (error) {
    console.error(`Failed to create table '${tableName}':`, error);
    throw error;
  }
}

// Add an endpoint to create a test admin user after tables are set up
export async function createTestAdmin() {
  try {
    // First check if the admin already exists
    const { data: existingAdmin, error: checkError } = await supabase
      .from('admins')
      .select('*')
      .eq('username', 'admin')
      .limit(1);
    
    if (!checkError && existingAdmin && existingAdmin.length > 0) {
      console.log('Test admin already exists, skipping creation');
      return { success: true, message: 'Test admin already exists' };
    }
    
    // Create an admin user if it doesn't exist
    const { data, error } = await supabase.rpc('run_sql', { 
      sql_query: `
        INSERT INTO admins (
          username, 
          password, 
          email, 
          phone, 
          display_name, 
          access_level,
          role
        ) VALUES (
          'admin',
          '$2b$10$kA7DZntb6sBfJYnZQOBCE.Kn2l8TvVKnwrqeflhQ3cYLTlWY5H3Qm', -- password is "admin123"
          'admin@example.com',
          '1234567890',
          'System Admin',
          'admin',
          'admin'
        )
        ON CONFLICT (username) DO NOTHING
        RETURNING *;
      `
    });
    
    if (error) {
      console.error('Error creating test admin:', error);
      return { success: false, error: error.message };
    }
    
    console.log('Test admin created successfully');
    return { success: true, message: 'Test admin created successfully' };
  } catch (error) {
    console.error('Exception creating test admin:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}