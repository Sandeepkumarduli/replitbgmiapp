#!/usr/bin/env tsx
/**
 * This script synchronizes database tables between PostgreSQL and Supabase
 * It checks which tables exist in each database and creates missing tables
 * 
 * Usage:
 * npm run sync-supabase (or npx tsx scripts/sync-supabase-tables.ts)
 */

import { createClient } from '@supabase/supabase-js';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../shared/schema';
import dotenv from 'dotenv';
import ws from 'ws';

// Configure neon WebSocket
neonConfig.webSocketConstructor = ws;

// Load environment variables
dotenv.config();

// Check for required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const databaseUrl = process.env.DATABASE_URL;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.');
  process.exit(1);
}

if (!databaseUrl) {
  console.error('Missing DATABASE_URL environment variable.');
  process.exit(1);
}

// Define a mapping between our schema table names and Supabase table names
const tableMapping = {
  'users': 'profiles', // Supabase uses 'profiles' for the users table
  'teams': 'teams',
  'team_members': 'team_members',
  'tournaments': 'tournaments',
  'registrations': 'registrations',
  'notifications': 'notifications',
  'notification_reads': 'notification_reads'
};

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize PostgreSQL connection
const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle({ client: pool, schema });

/**
 * Checks which tables exist in PostgreSQL
 */
async function checkPostgresqlTables() {
  const { rows } = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  
  return rows.map(row => row.table_name);
}

/**
 * Attempts to check which tables exist in Supabase
 * This is a best-effort check as we might not have proper permissions to list tables
 */
async function checkSupabaseTables() {
  // Try to list tables using RPC call (requires db_schema_read permission)
  try {
    const { data, error } = await supabase.rpc('get_tables');
    if (!error && data && Array.isArray(data)) {
      return data;
    }
  } catch (error) {
    console.warn('Could not list tables through RPC, falling back to table tests');
  }
  
  // Fallback: Test access to each table we expect to exist
  const expectedTables = Object.values(tableMapping);
  const tablesToCheck = [...new Set(expectedTables)];
  const results: string[] = [];
  
  for (const table of tablesToCheck) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        results.push(table);
      }
    } catch (err) {
      console.warn(`Error checking table ${table}:`, err);
    }
  }
  
  return results;
}

/**
 * Creates SQL statements for tables based on our schema
 */
function createSqlForMissingTables(missingTables: string[]): Record<string, string> {
  // These should match the definitions in schema.ts
  const tableDefinitions: Record<string, string> = {
    users: `
      CREATE TABLE IF NOT EXISTS "profiles" (
        "id" SERIAL PRIMARY KEY,
        "username" TEXT NOT NULL UNIQUE,
        "password" TEXT NOT NULL,
        "email" TEXT NOT NULL UNIQUE,
        "phone" TEXT NOT NULL UNIQUE,
        "phone_verified" BOOLEAN NOT NULL DEFAULT FALSE,
        "phone_verification_bypassed" BOOLEAN NOT NULL DEFAULT FALSE,
        "firebase_uid" TEXT,
        "game_id" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'user',
        "created_at" TIMESTAMP DEFAULT NOW()
      );
    `,
    teams: `
      CREATE TABLE IF NOT EXISTS "teams" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL UNIQUE,
        "owner_id" INTEGER NOT NULL REFERENCES "profiles"("id"),
        "game_type" TEXT NOT NULL DEFAULT 'BGMI',
        "invite_code" TEXT NOT NULL UNIQUE,
        "created_at" TIMESTAMP DEFAULT NOW()
      );
    `,
    team_members: `
      CREATE TABLE IF NOT EXISTS "team_members" (
        "id" SERIAL PRIMARY KEY,
        "team_id" INTEGER NOT NULL REFERENCES "teams"("id"),
        "username" TEXT NOT NULL,
        "game_id" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'member',
        "created_at" TIMESTAMP DEFAULT NOW()
      );
    `,
    tournaments: `
      CREATE TABLE IF NOT EXISTS "tournaments" (
        "id" SERIAL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "date" TIMESTAMP NOT NULL,
        "map_type" TEXT NOT NULL,
        "game_mode" TEXT NOT NULL DEFAULT 'Squad',
        "team_type" TEXT NOT NULL,
        "game_type" TEXT NOT NULL DEFAULT 'BGMI',
        "is_paid" BOOLEAN NOT NULL,
        "entry_fee" INTEGER DEFAULT 0,
        "prize_pool" INTEGER DEFAULT 0,
        "total_slots" INTEGER NOT NULL,
        "slots" INTEGER NOT NULL DEFAULT 100,
        "room_id" TEXT,
        "password" TEXT,
        "status" TEXT NOT NULL DEFAULT 'upcoming',
        "created_by" INTEGER NOT NULL REFERENCES "profiles"("id"),
        "created_at" TIMESTAMP DEFAULT NOW()
      );
    `,
    registrations: `
      CREATE TABLE IF NOT EXISTS "registrations" (
        "id" SERIAL PRIMARY KEY,
        "tournament_id" INTEGER NOT NULL REFERENCES "tournaments"("id"),
        "team_id" INTEGER NOT NULL REFERENCES "teams"("id"),
        "user_id" INTEGER NOT NULL REFERENCES "profiles"("id"),
        "slot" INTEGER,
        "registered_at" TIMESTAMP DEFAULT NOW()
      );
    `,
    notifications: `
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER REFERENCES "profiles"("id"),
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "type" TEXT NOT NULL DEFAULT 'general',
        "related_id" INTEGER,
        "is_read" BOOLEAN NOT NULL DEFAULT FALSE,
        "created_at" TIMESTAMP DEFAULT NOW()
      );
    `,
    notification_reads: `
      CREATE TABLE IF NOT EXISTS "notification_reads" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL REFERENCES "profiles"("id"),
        "notification_id" INTEGER NOT NULL REFERENCES "notifications"("id"),
        "created_at" TIMESTAMP DEFAULT NOW(),
        CONSTRAINT "user_notification_unique" UNIQUE ("user_id", "notification_id")
      );
    `
  };

  const sqlStatements: Record<string, string> = {};
  for (const table of missingTables) {
    if (tableDefinitions[table]) {
      sqlStatements[table] = tableDefinitions[table];
    }
  }
  
  return sqlStatements;
}

/**
 * Executes the SQL statements against Supabase using the REST API
 */
async function createTablesInSupabase(sqlStatements: Record<string, string>): Promise<void> {
  console.log('Creating tables in Supabase...');
  
  for (const [table, sql] of Object.entries(sqlStatements)) {
    const supabaseTable = tableMapping[table as keyof typeof tableMapping];
    console.log(`Creating ${table} as ${supabaseTable}...`);
    
    try {
      // Use raw SQL with Supabase
      const { data, error } = await supabase.rpc('exec_sql', { sql });
      
      if (error) {
        console.error(`Error creating table ${table}:`, error);
        
        // Try fallback method if RPC fails (might not have exec_sql function)
        try {
          // Direct REST call to pg endpoint (this requires special permissions)
          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          };
          
          if (supabaseAnonKey) {
            headers['apikey'] = supabaseAnonKey;
            headers['Authorization'] = `Bearer ${supabaseAnonKey}`;
          }
          
          const pgResp = await fetch(`${supabaseUrl}/rest/v1/`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ query: sql })
          });
          
          if (!pgResp.ok) {
            console.error(`Failed to create table ${table} with direct REST call:`, await pgResp.text());
          } else {
            console.log(`Created table ${table} with direct REST call.`);
          }
        } catch (restError) {
          console.error(`Failed to create table ${table} with direct REST call:`, restError);
        }
      } else {
        console.log(`Table ${table} created successfully.`);
      }
    } catch (error) {
      console.error(`Exception creating table ${table}:`, error);
    }
  }
}

/**
 * Copy data from PostgreSQL to Supabase
 */
async function syncData(tableMap: Record<string, string>): Promise<void> {
  console.log('Syncing data between PostgreSQL and Supabase...');
  
  for (const [pgTable, supabaseTable] of Object.entries(tableMap)) {
    console.log(`Syncing data for ${pgTable} -> ${supabaseTable}...`);
    
    try {
      // Get data from PostgreSQL
      const { rows } = await pool.query(`SELECT * FROM "${pgTable}"`);
      
      if (rows.length === 0) {
        console.log(`No data to sync for ${pgTable}.`);
        continue;
      }
      
      console.log(`Found ${rows.length} rows in ${pgTable}.`);
      
      // Insert data into Supabase
      try {
        const { error } = await supabase
          .from(supabaseTable)
          .upsert(rows, { onConflict: 'id' });
        
        if (error) {
          console.error(`Error syncing data for ${pgTable}:`, error);
        } else {
          console.log(`Successfully synced ${rows.length} rows from ${pgTable} to ${supabaseTable}.`);
        }
      } catch (supabaseError) {
        console.error(`Supabase error syncing data for ${pgTable}:`, supabaseError);
      }
    } catch (error) {
      console.error(`Exception syncing data for ${pgTable}:`, error);
    }
  }
}

async function main() {
  try {
    console.log('Checking PostgreSQL tables...');
    const pgTables = await checkPostgresqlTables();
    console.log('PostgreSQL tables:', pgTables);
    
    console.log('Checking Supabase tables...');
    const supabaseTables = await checkSupabaseTables();
    console.log('Supabase tables:', supabaseTables);
    
    // Check which tables from our schema are missing in Supabase
    const missingInSupabase = Object.keys(tableMapping).filter(pgTable => {
      const supabaseTable = tableMapping[pgTable];
      return !supabaseTables.includes(supabaseTable);
    });
    
    if (missingInSupabase.length > 0) {
      console.log('Tables missing in Supabase:', missingInSupabase);
      
      const sqlStatements = createSqlForMissingTables(missingInSupabase);
      console.log('SQL statements to create missing tables:', Object.keys(sqlStatements));
      
      // In non-interactive mode, just proceed with creating tables
      console.log('Creating missing tables in Supabase automatically...');
      await createTablesInSupabase(sqlStatements);
      
      // After creating tables, sync data
      const syncMap: Record<string, string> = {};
      for (const pgTable of pgTables) {
        if (tableMapping[pgTable as keyof typeof tableMapping]) {
          syncMap[pgTable] = tableMapping[pgTable as keyof typeof tableMapping];
        }
      }
      
      console.log('Tables to sync:', Object.keys(syncMap));
      
      // In non-interactive mode, just proceed with syncing data
      console.log('Syncing data automatically...');
      await syncData(syncMap);
      
      console.log('Done.');
    } else {
      console.log('All tables from schema exist in Supabase.');
    }
  } finally {
    // Always close the pool
    await pool.end();
  }
}

main().catch(error => {
  console.error('Error in main function:', error);
  process.exit(1);
});