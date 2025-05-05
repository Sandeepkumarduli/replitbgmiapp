/**
 * Supabase Diagnostic Tool
 * 
 * This script checks the status of your Supabase database and provides information
 * about tables and configuration.
 * 
 * Usage: node scripts/supabase-diagnostic.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Helper for printing colorful output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Setup Supabase client
async function setupSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(`${colors.red}Error: Missing Supabase credentials.${colors.reset}`);
    console.error(`Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env file.`);
    process.exit(1);
  }
  
  return createClient(supabaseUrl, supabaseAnonKey);
}

// Check if table exists and get its row count
async function checkTable(supabase, tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      return { exists: false, error: error.message };
    } else {
      return { exists: true, count, error: null };
    }
  } catch (err) {
    return { exists: false, error: err.message };
  }
}

// Check admin user
async function checkAdmin(supabase) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', 'Sandeepkumarduli')
      .single();
    
    if (error || !data) {
      return { exists: false, error: error ? error.message : 'Admin not found' };
    } else {
      return { 
        exists: true, 
        id: data.id,
        username: data.username,
        role: data.role,
        error: null
      };
    }
  } catch (err) {
    return { exists: false, error: err.message };
  }
}

// Main function
async function main() {
  console.log(`${colors.cyan}===== SUPABASE DIAGNOSTIC TOOL =====${colors.reset}`);
  console.log('Checking Supabase configuration and database status...\n');
  
  // Set up Supabase client
  const supabase = await setupSupabase();
  console.log(`${colors.green}✓${colors.reset} Supabase client initialized with URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  
  // Check all necessary tables
  const tables = [
    'users',
    'teams',
    'team_members',
    'tournaments',
    'registrations',
    'notifications',
    'notification_reads',
    'admins'
  ];
  
  console.log(`\n${colors.cyan}Checking database tables:${colors.reset}`);
  
  let allTablesExist = true;
  const tableStatuses = [];
  
  for (const table of tables) {
    const status = await checkTable(supabase, table);
    tableStatuses.push({ table, ...status });
    
    if (status.exists) {
      console.log(`${colors.green}✓${colors.reset} Table '${table}' exists with ${status.count ?? 'unknown'} rows`);
    } else {
      console.log(`${colors.red}✗${colors.reset} Table '${table}' doesn't exist: ${status.error}`);
      allTablesExist = false;
    }
  }
  
  // Check admin user
  console.log(`\n${colors.cyan}Checking admin user:${colors.reset}`);
  const adminStatus = await checkAdmin(supabase);
  
  if (adminStatus.exists) {
    console.log(`${colors.green}✓${colors.reset} Admin user '${adminStatus.username}' (ID: ${adminStatus.id}) exists with role: ${adminStatus.role}`);
  } else {
    console.log(`${colors.red}✗${colors.reset} Admin user doesn't exist: ${adminStatus.error}`);
  }
  
  // Display summary and next steps
  console.log(`\n${colors.cyan}Summary:${colors.reset}`);
  
  if (allTablesExist && adminStatus.exists) {
    console.log(`${colors.green}✓${colors.reset} Supabase database is properly configured!`);
    console.log(`${colors.green}✓${colors.reset} All required tables exist.`);
    console.log(`${colors.green}✓${colors.reset} Admin user is properly set up.`);
    console.log('\nYour application should be able to interact with Supabase correctly.');
  } else {
    console.log(`${colors.red}✗${colors.reset} Supabase database configuration is incomplete.`);
    
    if (!allTablesExist) {
      console.log(`${colors.yellow}!${colors.reset} Some required tables are missing. Please run the SQL setup script.`);
      console.log(`   See SUPABASE_SETUP_GUIDE.md for instructions.`);
    }
    
    if (!adminStatus.exists) {
      console.log(`${colors.yellow}!${colors.reset} Admin user is not set up. Please create an admin user.`);
      console.log(`   See SUPABASE_SETUP_GUIDE.md for instructions.`);
    }
  }
  
  console.log(`\n${colors.cyan}===== END OF DIAGNOSTIC =====${colors.reset}`);
}

// Run the main function
main().catch(error => {
  console.error(`${colors.red}Error running diagnostic:${colors.reset}`, error);
  process.exit(1);
});