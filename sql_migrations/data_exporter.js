#!/usr/bin/env node

/**
 * PostgreSQL Data Export Tool
 * 
 * This script exports data from PostgreSQL tables to SQL insert statements 
 * that can be easily imported into Supabase.
 * 
 * Run with: node data_exporter.js
 */

const { Pool } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Load environment variables
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Missing DATABASE_URL environment variable.');
  process.exit(1);
}

// Configure PostgreSQL connection
const pool = new Pool({ connectionString: databaseUrl });

// Tables to export
const tables = [
  { name: 'users', targetName: 'profiles' },
  { name: 'tournaments', targetName: 'tournaments' },
  { name: 'teams', targetName: 'teams' },
  { name: 'team_members', targetName: 'team_members' },
  { name: 'registrations', targetName: 'registrations' },
  { name: 'notifications', targetName: 'notifications' },
  { name: 'notification_reads', targetName: 'notification_reads' }
];

/**
 * Convert a value to its SQL representation
 */
function sqlValue(value) {
  if (value === null) {
    return 'NULL';
  } else if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  } else if (typeof value === 'string') {
    // Escape single quotes in strings
    return `'${value.replace(/'/g, "''")}'`;
  } else if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  } else {
    return `${value}`;
  }
}

/**
 * Generate INSERT statements for a table
 */
async function generateInserts(tableName, targetName) {
  try {
    // Get column names
    const { rows: columns } = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);
    
    const columnNames = columns.map(col => col.column_name);
    
    // Get data
    const { rows: data } = await pool.query(`SELECT * FROM "${tableName}"`);
    
    if (data.length === 0) {
      return `-- No data in ${tableName} table\n\n`;
    }
    
    let sql = `-- Data for ${tableName} table (to be imported into ${targetName})\n`;
    sql += `INSERT INTO ${targetName} (${columnNames.join(', ')})\nVALUES\n`;
    
    const valueRows = data.map(row => {
      const values = columnNames.map(col => sqlValue(row[col]));
      return `  (${values.join(', ')})`;
    });
    
    sql += valueRows.join(',\n');
    sql += `\nON CONFLICT (id) DO NOTHING;\n\n`;
    
    // Add sequence reset
    sql += `-- Reset the sequence for ${targetName}\n`;
    sql += `SELECT setval('${targetName}_id_seq', (SELECT COALESCE(MAX(id), 0) FROM ${targetName}), true);\n\n`;
    
    return sql;
  } catch (error) {
    console.error(`Error generating inserts for ${tableName}:`, error);
    return `-- Error generating inserts for ${tableName}: ${error.message}\n\n`;
  }
}

/**
 * Main export function
 */
async function exportData() {
  try {
    console.log('Starting data export...');
    
    let exportSql = `-- Data export from PostgreSQL to Supabase\n`;
    exportSql += `-- Generated on ${new Date().toISOString()}\n\n`;
    
    for (const table of tables) {
      console.log(`Exporting ${table.name}...`);
      
      const inserts = await generateInserts(table.name, table.targetName);
      exportSql += inserts;
    }
    
    // Write to file
    const outputFile = path.join(__dirname, 'import_data_complete.sql');
    fs.writeFileSync(outputFile, exportSql);
    
    console.log(`Export complete! SQL file created at: ${outputFile}`);
  } catch (error) {
    console.error('Export failed:', error);
  } finally {
    // Close db connection
    await pool.end();
  }
}

// Run export
exportData();