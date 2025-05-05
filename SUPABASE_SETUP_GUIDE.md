# Supabase Setup Guide for RD Tournaments Hub

This document provides step-by-step instructions for setting up your Supabase database for the RD Tournaments Hub application.

## Background

The RD Tournaments Hub application requires a properly configured Supabase database to function correctly. The JavaScript client alone cannot create the necessary database tables, so we need to set them up manually through the Supabase SQL Editor.

> **Critical Note:** Supabase does not allow direct execution of SQL from their JavaScript client by default. A special stored procedure needs to be created to enable this functionality, and this is included in our setup scripts.

## Instructions

### 1. Generate the SQL Setup Scripts

Run the following command in the terminal to generate the SQL scripts:

```bash
node scripts/supabase-sql-setup.js
```

This will create two files:
- `supabase-setup.sql` - The main script to create the tables and functions
- `supabase-rls.sql` - (Optional) Script for Row Level Security policies

### 2. Access the Supabase Dashboard

1. Go to [https://app.supabase.io/](https://app.supabase.io/)
2. Log in to your Supabase account
3. Select your project

### 3. Create the Tables Using the SQL Editor

1. In the Supabase dashboard, navigate to the **SQL Editor** section
2. Create a new query
3. Copy and paste the contents of `supabase-setup.sql` into the editor
4. Click "Run" to execute the SQL commands

This will:
- Create all the required tables for the application
- Set up the necessary stored procedures
- Insert a default admin user with username `Sandeepkumarduli` and password `Sandy@1234`

### 4. (Optional) Set Up Row Level Security

If you want to enable Row Level Security (recommended for production):

1. In the SQL Editor, create a new query
2. Copy and paste the contents of `supabase-rls.sql` into the editor
3. Click "Run" to execute the SQL commands

### 5. Verify the Setup

After running the SQL scripts, you can verify that everything is set up correctly:

1. In the Supabase dashboard, navigate to the **Table Editor** section
2. You should see all the required tables listed:
   - users
   - teams
   - team_members
   - tournaments
   - registrations
   - notifications
   - notification_reads
   - admins

3. Check the "users" table to confirm that the admin user was created

### 6. Configure Environment Variables

Make sure the following environment variables are set in your application:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

These values can be found in the Supabase dashboard under **Settings > API**.

## Troubleshooting

### Table Creation Errors

If you encounter errors during table creation:

1. Check that you have administrator privileges in your Supabase project
2. Verify that you're using the SQL Editor, not the JavaScript client, to create tables
3. Make sure all SQL statements are executed in the correct order (tables with foreign keys need their referenced tables to exist first)

### SQL Function Errors (PGRST202)

If you see errors like `PGRST202: Could not find the function public.run_sql`:

1. Ensure you've run the main setup SQL script which contains the `run_sql` function definition
2. If needed, manually create the function in the SQL Editor:
   ```sql
   CREATE OR REPLACE FUNCTION public.run_sql(sql_query TEXT) 
   RETURNS SETOF json AS $$
   BEGIN
       RETURN QUERY EXECUTE sql_query;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```
3. Make sure your application is calling this function correctly:
   ```javascript
   const { data, error } = await supabase.rpc('run_sql', { sql_query: 'SELECT * FROM users' });
   ```

### Connection Issues

If the application fails to connect to Supabase:

1. Verify that your environment variables are correctly set
2. Check the Supabase dashboard to ensure your project is active
3. Test the connection using the Supabase dashboard's API panel

### Access Permission Issues

If you encounter permission errors when accessing tables:

1. Check the Row Level Security (RLS) policies in the Supabase dashboard
2. Make sure your application is correctly authenticating with Supabase
3. Review the permission settings for each table in the Supabase dashboard

## Support

If you continue to experience issues, please contact the development team for additional support.