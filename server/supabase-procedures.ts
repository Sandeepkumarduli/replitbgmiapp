import { supabase } from './supabase';

// Function to create stored procedures for our application
export async function createStoredProcedures() {
  try {
    console.log('===== SETTING UP SUPABASE STORED PROCEDURES =====');
    
    // First, create a stored procedure to execute SQL queries
    // This is needed for our migration and diagnostic tools
    const executeSqlProc = `
      CREATE OR REPLACE FUNCTION execute_sql(query text)
      RETURNS VOID AS $$
      BEGIN
        EXECUTE query;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    // Run SQL query function that returns results
    const runSqlProc = `
      CREATE OR REPLACE FUNCTION run_sql(sql_query text)
      RETURNS JSONB AS $$
      DECLARE
        result JSONB;
      BEGIN
        EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || sql_query || ') t' INTO result;
        RETURN result;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    // List tables function
    const listTablesProc = `
      CREATE OR REPLACE FUNCTION list_tables()
      RETURNS TABLE (table_name text, table_schema text) AS $$
      BEGIN
        RETURN QUERY SELECT tables.table_name::text, tables.table_schema::text
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY tables.table_name;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    // List columns function
    const listColumnsProc = `
      CREATE OR REPLACE FUNCTION list_columns(table_name text)
      RETURNS TABLE (column_name text, data_type text, is_nullable text) AS $$
      BEGIN
        RETURN QUERY SELECT cols.column_name::text, cols.data_type::text, cols.is_nullable::text
        FROM information_schema.columns cols
        WHERE cols.table_schema = 'public' AND cols.table_name = list_columns.table_name
        ORDER BY cols.ordinal_position;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    // Create test table function
    const createTestTableProc = `
      CREATE OR REPLACE FUNCTION create_test_table()
      RETURNS VOID AS $$
      BEGIN
        CREATE TABLE IF NOT EXISTS diagnostic_test (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    // Drop test table function
    const dropTestTableProc = `
      CREATE OR REPLACE FUNCTION drop_test_table()
      RETURNS VOID AS $$
      BEGIN
        DROP TABLE IF EXISTS diagnostic_test;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    // Create procedure to create tables based on the schema
    const createSchemaTablesProc = `
      CREATE OR REPLACE FUNCTION create_schema_tables()
      RETURNS JSONB AS $$
      DECLARE
        result JSONB = '[]'::JSONB;
        created_tables JSONB = '[]'::JSONB;
      BEGIN
        -- Create users table if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
          CREATE TABLE users (
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
          created_tables = created_tables || jsonb_build_object('table', 'users', 'status', 'created');
        ELSE
          created_tables = created_tables || jsonb_build_object('table', 'users', 'status', 'already exists');
        END IF;
        
        -- Create teams table if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'teams') THEN
          CREATE TABLE teams (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            owner_id INTEGER NOT NULL REFERENCES users(id),
            game_type TEXT NOT NULL DEFAULT 'BGMI',
            invite_code TEXT NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          created_tables = created_tables || jsonb_build_object('table', 'teams', 'status', 'created');
        ELSE
          created_tables = created_tables || jsonb_build_object('table', 'teams', 'status', 'already exists');
        END IF;
        
        -- Create team_members table if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'team_members') THEN
          CREATE TABLE team_members (
            id SERIAL PRIMARY KEY,
            team_id INTEGER NOT NULL REFERENCES teams(id),
            username TEXT NOT NULL,
            game_id TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'member',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          created_tables = created_tables || jsonb_build_object('table', 'team_members', 'status', 'created');
        ELSE
          created_tables = created_tables || jsonb_build_object('table', 'team_members', 'status', 'already exists');
        END IF;
        
        -- Create tournaments table if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tournaments') THEN
          CREATE TABLE tournaments (
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
          created_tables = created_tables || jsonb_build_object('table', 'tournaments', 'status', 'created');
        ELSE
          created_tables = created_tables || jsonb_build_object('table', 'tournaments', 'status', 'already exists');
        END IF;
        
        -- Create registrations table if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'registrations') THEN
          CREATE TABLE registrations (
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
          created_tables = created_tables || jsonb_build_object('table', 'registrations', 'status', 'created');
        ELSE
          created_tables = created_tables || jsonb_build_object('table', 'registrations', 'status', 'already exists');
        END IF;
        
        -- Create notifications table if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
          CREATE TABLE notifications (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'info',
            user_id INTEGER REFERENCES users(id),
            related_id INTEGER,
            is_read BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          created_tables = created_tables || jsonb_build_object('table', 'notifications', 'status', 'created');
        ELSE
          created_tables = created_tables || jsonb_build_object('table', 'notifications', 'status', 'already exists');
        END IF;
        
        -- Create notification_reads table if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notification_reads') THEN
          CREATE TABLE notification_reads (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            notification_id INTEGER NOT NULL REFERENCES notifications(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, notification_id)
          );
          created_tables = created_tables || jsonb_build_object('table', 'notification_reads', 'status', 'created');
        ELSE
          created_tables = created_tables || jsonb_build_object('table', 'notification_reads', 'status', 'already exists');
        END IF;
        
        -- Create admins table if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admins') THEN
          CREATE TABLE admins (
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
          created_tables = created_tables || jsonb_build_object('table', 'admins', 'status', 'created');
        ELSE
          created_tables = created_tables || jsonb_build_object('table', 'admins', 'status', 'already exists');
        END IF;
        
        RETURN created_tables;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    // Try to create each stored procedure
    const procedures = [
      { name: 'execute_sql', sql: executeSqlProc },
      { name: 'run_sql', sql: runSqlProc },
      { name: 'list_tables', sql: listTablesProc },
      { name: 'list_columns', sql: listColumnsProc },
      { name: 'create_test_table', sql: createTestTableProc },
      { name: 'drop_test_table', sql: dropTestTableProc },
      { name: 'create_schema_tables', sql: createSchemaTablesProc }
    ];
    
    for (const proc of procedures) {
      try {
        // We can't directly create procedures via the Supabase JS client
        // We need to use a direct SQL query or RPC call
        console.log(`Creating stored procedure: ${proc.name}`);
        
        // For this example, we'll use a custom RPC endpoint that executes SQL
        // This assumes such an endpoint exists or you have admin privileges
        const { error } = await supabase.rpc('execute_sql', { query: proc.sql });
        
        if (error) {
          console.error(`Error creating stored procedure ${proc.name}:`, error);
          
          // Try alternate approach
          console.log(`Attempting alternate method for ${proc.name}...`);
          const { error: altError } = await supabase.rpc('run_sql', { sql_query: proc.sql });
          
          if (altError) {
            console.error(`Alternate method failed for ${proc.name}:`, altError);
          } else {
            console.log(`Created ${proc.name} using alternate method`);
          }
        } else {
          console.log(`Successfully created stored procedure: ${proc.name}`);
        }
      } catch (err) {
        console.error(`Exception creating stored procedure ${proc.name}:`, err);
      }
    }
    
    console.log('===== STORED PROCEDURES SETUP COMPLETED =====');
  } catch (error) {
    console.error('Error creating stored procedures:', error);
  }
}

// Function to create tables using schema
export async function createSchemaTables() {
  try {
    console.log('Creating schema tables using stored procedure...');
    
    const { data, error } = await supabase.rpc('create_schema_tables');
    
    if (error) {
      console.error('Error creating schema tables via stored procedure:', error);
      return false;
    }
    
    console.log('Tables created successfully:', data);
    return true;
  } catch (error) {
    console.error('Exception creating schema tables:', error);
    return false;
  }
}