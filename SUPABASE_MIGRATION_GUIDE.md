# Supabase Migration Guide for RD Tournaments Hub

This guide provides instructions for migrating the RD Tournaments Hub application from Neon DB to Supabase.

## Why Migrate to Supabase?

Supabase offers a comprehensive platform with:
- Authentication management
- Database services
- Real-time subscriptions
- Storage solutions
- Edge functions

By migrating to Supabase, we consolidate our infrastructure and gain access to these features through a unified API.

## Prerequisites

Before starting the migration, ensure you have:

1. A Supabase account and project created
2. Supabase Project URL and anon key
3. Admin access to your Supabase project

## Migration Steps

### 1. Create Required SQL Functions (MOST CRITICAL STEP)

Before any other steps, you **MUST** create the SQL functions in Supabase to enable proper communication between the application and database:

1. Access the Supabase SQL Editor
2. Create a new query
3. Copy and paste the following SQL and execute it:

```sql
-- Function to execute arbitrary SQL (required for diagnostics and schema management)
CREATE OR REPLACE FUNCTION public.run_sql(sql_query TEXT) 
RETURNS SETOF json AS $$
BEGIN
    RETURN QUERY EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Alternative function name for compatibility
CREATE OR REPLACE FUNCTION public.execute_sql(query TEXT) 
RETURNS SETOF json AS $$
BEGIN
    RETURN QUERY EXECUTE query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to list all tables in the public schema
CREATE OR REPLACE FUNCTION public.list_tables()
RETURNS TABLE(table_name text) AS $$
BEGIN
    RETURN QUERY 
    SELECT t.table_name::text
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**You must execute this SQL in the Supabase SQL Editor before proceeding with any other steps. The application WILL NOT work without these functions!**

### 2. Set Up Supabase Database Tables

Once the SQL functions are created, we need to set up the database tables:

1. Generate the SQL setup scripts:
   ```bash
   node scripts/supabase-sql-setup.js
   ```

2. Follow the instructions in `SUPABASE_SETUP_GUIDE.md` to create the tables using the Supabase SQL Editor

### 3. Configure Environment Variables

Update your environment variables to use Supabase:

1. Set the following variables in your `.env` file:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

2. Ensure no old Neon DB variables are being used in the application

### 4. Run Database Diagnostic

Verify that your Supabase setup is working correctly:

```bash
node scripts/supabase-diagnostic.js
```

This tool will check your Supabase configuration and database status.

### 5. Test Authentication

Test the authentication system to ensure it's working with Supabase:

1. Try to register a new user
2. Test the login functionality
3. Verify admin access

### 6. Verify Data Operations

Ensure all data operations are working correctly:

1. Create test data (teams, tournaments, etc.)
2. Test updating and deleting records
3. Verify that notifications are working

## Troubleshooting

### Authentication Issues

If you encounter authentication issues:

1. Check that the admin user was created during setup
2. Verify the `auth` endpoints are correctly using the Supabase client
3. Check Row Level Security (RLS) policies if you enabled them

### Data Access Issues

If you cannot create or access data:

1. Verify the Supabase client is correctly initialized
2. Check that the table names in queries match the ones created in the database
3. Ensure you're using the correct Supabase URL and anon key

### Deployment Issues

For deployment-related issues:

1. Make sure all environment variables are set in your deployment environment
2. Check that the build process includes the Supabase configuration
3. Verify that the Supabase project is correctly set up for production use

## Support

If you continue to experience issues with the migration, please contact the development team for additional support.