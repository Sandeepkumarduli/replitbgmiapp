# Supabase Database Setup Guide

This guide will help you properly set up your Supabase database for the BGMI Tournaments application.

## Prerequisites

1. A Supabase project with the following environment variables set:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key

## Step 1: Create the required SQL function in Supabase

Before running any setup scripts, you must first create a special SQL function in your Supabase database. This function allows our application to execute SQL commands securely.

1. Log in to your [Supabase dashboard](https://app.supabase.com)
2. Select your project
3. Go to the "SQL Editor" tab
4. Create a new query and paste the following SQL:

```sql
-- First, drop the existing function if it exists
DROP FUNCTION IF EXISTS public.run_sql(text);

-- Create the run_sql function with JSONB return type for better compatibility
CREATE OR REPLACE FUNCTION public.run_sql(sql_query TEXT) 
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || sql_query || ') AS t' INTO result;
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$;
```

5. Click "Run" to execute the SQL and create the function

## Step 2: Run the secure setup script

Once the SQL function is created, you can run the secure setup script to create all the necessary tables and an admin user:

```bash
# Make sure you're in the project root directory
node scripts/secure-setup.js
```

This script will:

1. Test if the `run_sql` function exists in your Supabase database
2. Create all necessary database tables if they don't already exist
3. Create an admin user with the following credentials:
   - Username: `admin`
   - Password: `admin123`
4. Verify that all tables are working properly

### Security Note

The script uses the default admin password (`admin123`) for initial setup. **You should change this password immediately after logging in for the first time!**

## Step 3: Alternative Setup Methods

If you prefer not to use the script directly, here are alternative ways to set up your database:

### Option 1: Using the server-side setup utility

You can use the integrated server-side utility to create the admin user:

```bash
# Run the server-side admin setup utility
node server/setup-admin.js
```

### Option 2: Using the Supabase Setup page

For a more visual approach, you can use the Supabase Setup page in the application:

1. Start the application (`npm run dev`)
2. Navigate to `/supabase-setup` in your browser
3. Click "Create All Missing Tables" to create the necessary tables
4. Click "Create Admin User" to create the admin user

## Troubleshooting

### Error: "function run_sql(text) does not exist"

This means you need to create the `run_sql` function in your Supabase database. Follow Step 1 of this guide.

### Error: "relation does not exist"

This means the tables don't exist yet. Run the setup script or use the Supabase Setup page to create them.

### Tables not showing in Supabase dashboard

Tables created using the `run_sql` function will appear in the "Table Editor" section of your Supabase dashboard. If they don't appear immediately, try refreshing the page.

## Full Database Schema

The setup creates the following tables:

1. `users` - User accounts
2. `admins` - Admin accounts
3. `teams` - Teams for tournaments
4. `team_members` - Members of teams
5. `tournaments` - Tournament details
6. `registrations` - Tournament registrations
7. `notifications` - User notifications
8. `notification_reads` - Tracks which notifications have been read

For details on each table's structure, check the SQL in the `scripts/secure-setup.js` file.