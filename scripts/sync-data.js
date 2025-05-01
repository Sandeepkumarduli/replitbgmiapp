/**
 * This script synchronizes data between in-memory storage and Supabase
 * Usage: 
 * - Export data from in-memory to Supabase: node scripts/sync-data.js --export
 * - Import data from Supabase to in-memory: node scripts/sync-data.js --import
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');
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

// Password hashing utilities
const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

// Data export/import functions
async function exportDataToSupabase() {
  try {
    console.log('Exporting data to Supabase...');
    
    // Get data from memory storage (saved in a JSON file)
    const dataPath = path.join(__dirname, '../data/memory-data.json');
    
    if (!fs.existsSync(dataPath)) {
      console.error('No data file found at', dataPath);
      console.log('Creating data backup directory...');
      fs.mkdirSync(path.join(__dirname, '../data'), { recursive: true });
      fs.writeFileSync(dataPath, JSON.stringify({
        users: [],
        teams: [],
        teamMembers: [],
        tournaments: [],
        registrations: []
      }));
      console.log('Created empty data file.');
    }
    
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    // Process users - hash passwords if not already hashed
    const processedUsers = [];
    for (const user of data.users) {
      // Check if password is already hashed (contains a dot separator)
      if (!user.password.includes('.')) {
        user.password = await hashPassword(user.password);
      }
      processedUsers.push(user);
    }
    
    // Insert data into Supabase tables
    if (processedUsers.length > 0) {
      console.log('Inserting users...');
      const { error: usersError } = await supabase
        .from('users')
        .upsert(processedUsers, { onConflict: 'id' });
      
      if (usersError) {
        console.error('Error inserting users:', usersError);
      } else {
        console.log(`Inserted ${processedUsers.length} users.`);
      }
    }
    
    if (data.teams.length > 0) {
      console.log('Inserting teams...');
      const { error: teamsError } = await supabase
        .from('teams')
        .upsert(data.teams, { onConflict: 'id' });
      
      if (teamsError) {
        console.error('Error inserting teams:', teamsError);
      } else {
        console.log(`Inserted ${data.teams.length} teams.`);
      }
    }
    
    if (data.teamMembers.length > 0) {
      console.log('Inserting team members...');
      const { error: membersError } = await supabase
        .from('team_members')
        .upsert(data.teamMembers, { onConflict: 'id' });
      
      if (membersError) {
        console.error('Error inserting team members:', membersError);
      } else {
        console.log(`Inserted ${data.teamMembers.length} team members.`);
      }
    }
    
    if (data.tournaments.length > 0) {
      console.log('Inserting tournaments...');
      const { error: tournamentsError } = await supabase
        .from('tournaments')
        .upsert(data.tournaments, { onConflict: 'id' });
      
      if (tournamentsError) {
        console.error('Error inserting tournaments:', tournamentsError);
      } else {
        console.log(`Inserted ${data.tournaments.length} tournaments.`);
      }
    }
    
    if (data.registrations.length > 0) {
      console.log('Inserting registrations...');
      const { error: registrationsError } = await supabase
        .from('registrations')
        .upsert(data.registrations, { onConflict: 'id' });
      
      if (registrationsError) {
        console.error('Error inserting registrations:', registrationsError);
      } else {
        console.log(`Inserted ${data.registrations.length} registrations.`);
      }
    }
    
    console.log('Data export to Supabase completed!');
  } catch (error) {
    console.error('Export failed:', error);
  }
}

async function importDataFromSupabase() {
  try {
    console.log('Importing data from Supabase...');
    
    // Fetch all data from Supabase
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');
      
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }
    
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*');
      
    if (teamsError) {
      console.error('Error fetching teams:', teamsError);
      return;
    }
    
    const { data: teamMembers, error: membersError } = await supabase
      .from('team_members')
      .select('*');
      
    if (membersError) {
      console.error('Error fetching team members:', membersError);
      return;
    }
    
    const { data: tournaments, error: tournamentsError } = await supabase
      .from('tournaments')
      .select('*');
      
    if (tournamentsError) {
      console.error('Error fetching tournaments:', tournamentsError);
      return;
    }
    
    const { data: registrations, error: registrationsError } = await supabase
      .from('registrations')
      .select('*');
      
    if (registrationsError) {
      console.error('Error fetching registrations:', registrationsError);
      return;
    }
    
    // Prepare data for storage
    const data = {
      users: users || [],
      teams: teams || [],
      teamMembers: teamMembers || [],
      tournaments: tournaments || [],
      registrations: registrations || []
    };
    
    // Save to file
    const dataPath = path.join(__dirname, '../data/memory-data.json');
    fs.mkdirSync(path.join(__dirname, '../data'), { recursive: true });
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    
    console.log('Data imported from Supabase successfully!');
    console.log(`Users: ${data.users.length}`);
    console.log(`Teams: ${data.teams.length}`);
    console.log(`Team Members: ${data.teamMembers.length}`);
    console.log(`Tournaments: ${data.tournaments.length}`);
    console.log(`Registrations: ${data.registrations.length}`);
    
  } catch (error) {
    console.error('Import failed:', error);
  }
}

// Get the correct function to run based on command-line args
async function run() {
  const args = process.argv.slice(2);
  
  if (args.includes('--export')) {
    await exportDataToSupabase();
  } else if (args.includes('--import')) {
    await importDataFromSupabase();
  } else {
    console.log('Please specify either --export or --import');
    console.log('--export: Export data from memory to Supabase');
    console.log('--import: Import data from Supabase to memory');
  }
}

// Run the script
run().catch(err => {
  console.error('Script execution failed:', err);
  process.exit(1);
});