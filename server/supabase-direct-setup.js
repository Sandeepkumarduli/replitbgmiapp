/**
 * Direct Supabase Table Creation Script
 * This script creates tables directly in Supabase using SQL statements
 * and the Supabase REST API.
 */

import { supabase } from './supabase.js';
import bcrypt from 'bcrypt';
import { tables, generateCreateTableSQL, simplifySQL } from '../scripts/supabase-tables.js';

// Hash password securely
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Test if run_sql function exists in Supabase
async function testRunSqlFunction() {
  try {
    console.log('Testing run_sql function...');
    const { data, error } = await supabase.rpc('run_sql', {
      sql_query: 'SELECT now() as current_time'
    });
    
    if (error) {
      console.error('Error testing run_sql function:', error);
      return false;
    }
    
    console.log('run_sql function is working:', data);
    return true;
  } catch (err) {
    console.error('Exception testing run_sql function:', err);
    return false;
  }
}

// Create tables directly using SQL statements via the run_sql function
async function createTables() {
  console.log('Creating tables...');
  
  // Check if run_sql function exists first
  const runSqlExists = await testRunSqlFunction();
  if (!runSqlExists) {
    console.error('Cannot create tables: run_sql function not available in Supabase');
    console.log('Please create the run_sql function first using the SQL in scripts/create_run_sql_function.sql');
    return false;
  }
  
  // Generate SQL for each table
  const tableSQL = Object.values(tables).map(table => ({
    name: table.name,
    sql: generateCreateTableSQL(table)
  }));
  
  // Create tables one by one
  let success = true;
  for (const table of tableSQL) {
    try {
      console.log(`Creating table: ${table.name}...`);
      
      // First check if table already exists
      const { data: checkData, error: checkError } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true });
      
      if (!checkError) {
        console.log(`Table ${table.name} already exists, skipping`);
        continue;
      }
      
      // Create table
      const simplifiedSQL = simplifySQL(table.sql);
      console.log(`SQL: ${simplifiedSQL}`);
      
      const { data, error } = await supabase.rpc('run_sql', {
        sql_query: simplifiedSQL
      });
      
      if (error) {
        console.error(`Error creating table ${table.name}:`, error);
        success = false;
        
        // Try a different approach with just the query
        console.log(`Attempting alternative approach for ${table.name}...`);
        const testSQL = `SELECT 1 as test`;
        const { data: testData, error: testError } = await supabase.rpc('run_sql', {
          sql_query: testSQL
        });
        
        if (testError) {
          console.error('Even simple SQL query failed:', testError);
        } else {
          console.log('Simple SQL query works, issue might be with complex CREATE TABLE statements');
        }
      } else {
        console.log(`Table ${table.name} created successfully`);
      }
    } catch (err) {
      console.error(`Exception creating table ${table.name}:`, err);
      success = false;
    }
  }
  
  return success;
}

// Create a user in the users table
async function createUser(username, password, email, phone, gameId, role = 'user') {
  console.log(`Creating user: ${username}...`);
  
  try {
    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, username')
      .eq('username', username)
      .limit(1);
    
    if (!checkError && existingUser && existingUser.length > 0) {
      console.log(`User ${username} already exists (ID: ${existingUser[0].id})`);
      return existingUser[0];
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Insert user directly through the Supabase API
    const { data, error } = await supabase
      .from('users')
      .insert({
        username,
        password: hashedPassword,
        email,
        phone,
        game_id: gameId,
        role,
        phone_verified: false,
        phone_verification_bypassed: true
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating user:', error);
      
      // Try to create user with SQL as a fallback
      const sql = `INSERT INTO users (username, password, email, phone, game_id, role, phone_verified, phone_verification_bypassed)
        VALUES ('${username}', '${hashedPassword}', '${email}', '${phone}', '${gameId}', '${role}', false, true)
        RETURNING id, username, email, role`;
      
      const { data: sqlData, error: sqlError } = await supabase.rpc('run_sql', {
        sql_query: sql
      });
      
      if (sqlError) {
        console.error('Error creating user with SQL:', sqlError);
        return null;
      }
      
      console.log('User created via SQL:', sqlData[0]);
      return sqlData[0];
    }
    
    console.log('User created:', data);
    return data;
  } catch (err) {
    console.error('Exception creating user:', err);
    return null;
  }
}

// Create admin user
async function createAdminUser(username = 'admin', password = 'admin123') {
  console.log('Creating admin user...');
  
  try {
    // Check if admin already exists
    const { data: existingAdmin, error: checkError } = await supabase
      .from('admins')
      .select('id, username')
      .eq('username', username)
      .limit(1);
    
    if (!checkError && existingAdmin && existingAdmin.length > 0) {
      console.log(`Admin ${username} already exists (ID: ${existingAdmin[0].id})`);
      return existingAdmin[0];
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Insert admin directly through the Supabase API
    const { data, error } = await supabase
      .from('admins')
      .insert({
        username,
        password: hashedPassword,
        email: 'admin@example.com',
        phone: '1234567890',
        display_name: 'System Admin',
        access_level: 'admin',
        role: 'admin',
        is_active: true
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating admin:', error);
      
      // Try to create admin with SQL as a fallback
      const sql = `INSERT INTO admins (username, password, email, phone, display_name, access_level, role, is_active)
        VALUES ('${username}', '${hashedPassword}', 'admin@example.com', '1234567890', 'System Admin', 'admin', 'admin', true)
        RETURNING id, username, email, role`;
      
      const { data: sqlData, error: sqlError } = await supabase.rpc('run_sql', {
        sql_query: sql
      });
      
      if (sqlError) {
        console.error('Error creating admin with SQL:', sqlError);
        return null;
      }
      
      console.log('Admin created via SQL:', sqlData[0]);
      return sqlData[0];
    }
    
    console.log('Admin created:', data);
    return data;
  } catch (err) {
    console.error('Exception creating admin:', err);
    return null;
  }
}

// Verify database is working by counting rows in tables
async function verifyDatabase() {
  console.log('Verifying database...');
  
  const tableNames = Object.keys(tables);
  const results = {};
  
  for (const tableName of tableNames) {
    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error(`Error verifying table ${tableName}:`, error);
        results[tableName] = { exists: false, error: error.message };
      } else {
        console.log(`Table ${tableName} exists with ${count || 0} rows`);
        results[tableName] = { exists: true, count: count || 0 };
      }
    } catch (err) {
      console.error(`Exception verifying table ${tableName}:`, err);
      results[tableName] = { exists: false, error: err.message };
    }
  }
  
  return results;
}

// Main setup function
export async function setupSupabaseDatabase() {
  console.log('=== Starting Supabase Database Setup ===');
  
  // Create tables
  const tablesCreated = await createTables();
  console.log('Tables creation complete:', tablesCreated ? 'success' : 'failed');
  
  // Create admin user
  const admin = await createAdminUser();
  console.log('Admin user creation:', admin ? 'success' : 'failed');
  
  // Create a regular test user
  const user = await createUser('testuser', 'password123', 'test@example.com', '9876543210', 'TESTGAME123');
  console.log('Test user creation:', user ? 'success' : 'failed');
  
  // Verify database
  const verification = await verifyDatabase();
  console.log('Database verification results:', verification);
  
  return {
    tablesCreated,
    admin,
    user,
    verification
  };
}

// If this script is run directly, perform setup
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Running Supabase setup directly...');
  setupSupabaseDatabase()
    .then(result => {
      console.log('=== Supabase Setup Complete ===');
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(err => {
      console.error('=== Supabase Setup Failed ===');
      console.error(err);
      process.exit(1);
    });
}