import { supabase } from './supabase';
import { admins, notificationReads, notifications, registrations, teamMembers, teams, tournaments, users } from '../shared/schema';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { sql } from 'drizzle-orm';
import { createSchemaTables, createStoredProcedures } from './supabase-procedures';

// Function to generate SQL DDL statements for tables
export function generateTableDDL() {
  // This is a simplified way to manually create the tables
  // In a production app, we would use drizzle migrations
  
  const tableCreationSQL = {
    users: `
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
    `,
    
    teams: `
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        owner_id INTEGER NOT NULL REFERENCES users(id),
        game_type TEXT NOT NULL DEFAULT 'BGMI',
        invite_code TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `,
    
    team_members: `
      CREATE TABLE IF NOT EXISTS team_members (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL REFERENCES teams(id),
        username TEXT NOT NULL,
        game_id TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `,
    
    tournaments: `
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
    `,
    
    registrations: `
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
    `,
    
    notifications: `
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
    `,
    
    notification_reads: `
      CREATE TABLE IF NOT EXISTS notification_reads (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        notification_id INTEGER NOT NULL REFERENCES notifications(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, notification_id)
      );
    `,
    
    admins: `
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
  
  return tableCreationSQL;
}

// Function to ensure tables exist in Supabase
export async function ensureTablesExist() {
  const tableSQL = generateTableDDL();
  const tableNames = Object.keys(tableSQL);
  
  console.log('===== ENSURING SUPABASE TABLES EXIST =====');
  
  for (const tableName of tableNames) {
    try {
      console.log(`Creating table if not exists: ${tableName}`);
      
      // First check if table exists by querying it
      const { error: checkError } = await supabase
        .from(tableName)
        .select('count(*)', { count: 'exact', head: true });
      
      if (checkError) {
        console.log(`Table '${tableName}' doesn't exist or not accessible:`, checkError.message);
        
        // Try to create the table using SQL
        const { error: createError } = await supabase.rpc(
          'run_sql', 
          { sql_query: tableSQL[tableName] }
        );
        
        if (createError) {
          console.error(`Error creating table '${tableName}':`, createError);
          
          // Try alternate method with raw queries if RPC fails
          console.log(`Attempting to create '${tableName}' with direct query...`);
          
          // This approach requires the user to have sufficient database permissions
          const { error: directError } = await supabase.rpc(
            'execute_sql', 
            { query: tableSQL[tableName] }
          );
          
          if (directError) {
            console.error(`Failed to create '${tableName}' with direct query:`, directError);
          } else {
            console.log(`Successfully created table '${tableName}' with direct query`);
          }
        } else {
          console.log(`Successfully created table '${tableName}'`);
        }
      } else {
        console.log(`Table '${tableName}' already exists`);
      }
    } catch (error) {
      console.error(`Error ensuring table '${tableName}' exists:`, error);
    }
  }
  
  console.log('===== TABLE CREATION COMPLETED =====');
}

// Function to try using Drizzle ORM's migrate functionality
export async function runDrizzleMigration() {
  try {
    console.log('Attempting to run Drizzle migration...');
    
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL is not set, cannot run migration');
      return;
    }
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);
    
    // Use Drizzle's SQL executor to check for tables
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('Current database tables:', result.rows);
    
    // Now try to create tables if needed
    const schema = {
      users,
      teams,
      teamMembers,
      tournaments,
      registrations,
      notifications,
      notificationReads,
      admins
    };
    
    // This will set up all tables according to the schema
    console.log('Creating tables from schema...');
    
    // WARNING: This is for development only, normally we'd use migrations
    // await migrate(db, { migrationsFolder: './drizzle' });
    
    // For our case, let's just try to create the tables directly
    // This requires proper DATABASE_URL with admin privileges
    const tableSQL = generateTableDDL();
    
    for (const [tableName, sql] of Object.entries(tableSQL)) {
      try {
        console.log(`Creating table ${tableName} if not exists...`);
        await db.execute(sql);
        console.log(`Table ${tableName} created or already exists`);
      } catch (error) {
        console.error(`Error creating table ${tableName}:`, error);
      }
    }
    
    console.log('Drizzle schema setup complete');
  } catch (error) {
    console.error('Error during Drizzle migration:', error);
  }
}

// Function to check/create role-based policies
export async function setupRLS() {
  try {
    console.log('Setting up Row-Level Security policies...');
    
    // This is advanced and would typically be configured in the Supabase dashboard
    // or through SQL migrations
    
    // Example: Allow authenticated users to select from users table
    const { error } = await supabase.rpc(
      'run_sql',
      {
        sql_query: `
          -- Enable RLS on tables
          ALTER TABLE users ENABLE ROW LEVEL SECURITY;
          
          -- Create policies
          CREATE POLICY IF NOT EXISTS "Users can view their own data" 
          ON users FOR SELECT 
          USING (auth.uid() = firebase_uid);
          
          -- Make tables accessible to authenticated users
          GRANT SELECT ON users TO authenticated;
          GRANT INSERT, UPDATE ON users TO authenticated;
        `
      }
    );
    
    if (error) {
      console.error('Error setting up RLS policies:', error);
    } else {
      console.log('RLS policies set up successfully');
    }
  } catch (error) {
    console.error('Error during RLS setup:', error);
  }
}

// Main function to run migrations
export async function runMigrations() {
  console.log('Running Supabase database migrations...');
  
  try {
    // First, try to create stored procedures that will help us manage tables
    console.log('Setting up stored procedures...');
    await createStoredProcedures();
    
    // Try to create tables using our stored procedure
    console.log('Creating tables using stored procedure...');
    const tablesCreated = await createSchemaTables();
    
    if (!tablesCreated) {
      console.log('Falling back to direct table creation method...');
      
      // Try using information_schema to check tables
      try {
        // Try to query information_schema directly
        const { data, error } = await supabase
          .from('information_schema')
          .select('*')
          .eq('table_schema', 'public')
          .limit(1);
          
        console.log('Information schema query result:', error ? 'Error' : 'Success');
        
        if (error) {
          // Fallback to our direct table creation
          await ensureTablesExist();
        } else {
          // Try using SQL to check tables
          const { data: tablesData, error: tablesError } = await supabase.rpc(
            'run_sql',
            {
              sql_query: `
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name;
              `
            }
          );
          
          if (tablesError) {
            console.error('Error fetching tables:', tablesError);
            console.log('Fallback to directly creating tables...');
            await ensureTablesExist();
          } else {
            console.log('Current database tables:', tablesData);
            
            // Check if we need to create any missing tables
            const existingTables = tablesData.map((row: any) => row.table_name);
            const requiredTables = ['users', 'teams', 'team_members', 'tournaments', 
                                  'registrations', 'notifications', 'notification_reads', 'admins'];
            
            const missingTables = requiredTables.filter(table => !existingTables.includes(table));
            
            if (missingTables.length > 0) {
              console.log('Missing tables detected:', missingTables);
              await ensureTablesExist();
            } else {
              console.log('All required tables exist');
            }
          }
        }
      } catch (error) {
        console.error('Error checking information_schema:', error);
        await ensureTablesExist();
      }
    }
    
    // Try setting up RLS policies (if user has permissions)
    // await setupRLS();
    
    // Print out debugging information about each table 
    await printTableStructures();
    
  } catch (error) {
    console.error('Error during migration:', error);
    
    // Fallback to Drizzle migration
    console.log('Attempting Drizzle migration as fallback...');
    await runDrizzleMigration();
  }
}

// Helper to print out all table structures
async function printTableStructures() {
  console.log('===== SUPABASE TABLE STRUCTURES =====');
  const tableNames = [
    'users', 'teams', 'team_members', 'tournaments', 
    'registrations', 'notifications', 'notification_reads', 'admins'
  ];
  
  for (const tableName of tableNames) {
    try {
      // First check if the table exists
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      console.log(`Table '${tableName}' check:`, error ? 'Error' : 'Success');
      
      if (!error) {
        // Get column information
        const { data: columnsData, error: columnsError } = await supabase.rpc(
          'run_sql',
          {
            sql_query: `
              SELECT column_name, data_type, is_nullable
              FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = '${tableName}'
              ORDER BY ordinal_position;
            `
          }
        );
        
        if (columnsError) {
          console.error(`Error getting columns for '${tableName}':`, columnsError);
        } else {
          console.log(`Table '${tableName}' columns:`, columnsData);
        }
        
        // Get row count
        const { count, error: countError } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
          
        if (countError) {
          console.error(`Error counting rows in '${tableName}':`, countError);
        } else {
          console.log(`Table '${tableName}' has ${count} rows`);
        }
      }
    } catch (error) {
      console.error(`Error examining table '${tableName}':`, error);
    }
  }
  
  console.log('===== END TABLE STRUCTURES =====');
}