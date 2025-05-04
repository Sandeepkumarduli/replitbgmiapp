# Supabase Database Migration Instructions

This directory contains SQL scripts and tools to help migrate data from your PostgreSQL database to Supabase.

## Files Included

1. `supabase_tables_setup.sql` - SQL to drop existing tables in Supabase and create all required tables
2. `export_postgresql_data.sql` - SQL queries to export data from PostgreSQL
3. `import_data_to_supabase.sql` - Template for importing data into Supabase
4. `data_exporter.js` - Node.js script to automatically generate import SQL

## Migration Steps

### Step 1: Set Up Tables in Supabase

1. Log in to your Supabase dashboard at https://app.supabase.com
2. Select your project
3. Go to SQL Editor
4. Create a new query
5. Copy and paste the contents of `supabase_tables_setup.sql`
6. Run the SQL to create all tables

### Step 2: Export Data from PostgreSQL

To export data from PostgreSQL, you have two options:

#### Option A: Use the Data Exporter Script (Recommended)

1. Run the data exporter script:
   ```
   node sql_migrations/data_exporter.js
   ```
2. This will create a file `sql_migrations/import_data_complete.sql` with all your data ready to import

#### Option B: Manual Export

1. Run each query in `export_postgresql_data.sql` in your PostgreSQL database
2. Save the results for each table
3. Manually format the data for the `import_data_to_supabase.sql` template

### Step 3: Import Data into Supabase

1. Go back to the Supabase SQL Editor
2. Create a new query
3. Copy and paste the contents of your generated `import_data_complete.sql` (or your manually prepared import SQL)
4. Run the SQL to import your data

### Step 4: Verify the Migration

1. In Supabase, go to the Table Editor
2. Check that all tables have been created
3. Verify that data has been imported correctly
4. Test the application with the new database

## Notes

- The migration assumes that table IDs match between PostgreSQL and Supabase
- Foreign key relationships will be preserved
- The scripts include `ON CONFLICT (id) DO NOTHING` to avoid duplicate key errors
- Sequence numbers are reset after import to ensure new records get correct IDs

## Troubleshooting

- If you encounter errors during table creation, ensure that you're dropping the existing tables first
- For data import errors, check for any formatting issues or inconsistencies in your data
- If sequences are not correctly reset, manually set them with: `SELECT setval('table_name_id_seq', (SELECT MAX(id) FROM table_name));`