# Step-by-Step Migration Guide for Supabase

This guide will walk you through executing the SQL migration script in Supabase to create all required tables and import the existing data.

## Prerequisites
- Access to your Supabase dashboard
- The complete_supabase_migration.sql file in this directory

## Steps to Create All Tables in Supabase

### 1. Log in to Supabase Dashboard
- Go to https://app.supabase.com/
- Sign in with your credentials
- Select your project: **fiouuhhbascmlbrncqcp**

### 2. Navigate to SQL Editor
- In the left sidebar, click on **SQL Editor**

### 3. Create a New Query
- Click on the **+ New Query** button

### 4. Paste the Migration Script
- Open the `complete_supabase_migration.sql` file from this directory
- Copy the **entire contents** of the file
- Paste it into the SQL Editor in Supabase

### 5. Run the Migration Script
- Click the **Run** button (or press Ctrl+Enter)
- This will execute the SQL script which will:
  - Drop existing tables (if any)
  - Create all necessary tables with proper structure
  - Import essential data (admin user, tournament, notifications)
  - Set up Row Level Security policies

### 6. Verify the Results
- Once the script execution completes, you should see a success message
- In the left sidebar, click on **Table Editor**
- You should see the following tables:
  - profiles (users table)
  - teams
  - team_members
  - tournaments
  - registrations
  - notifications
  - notification_reads

### 7. Verify the Data
- Click on the **profiles** table, and you should see 1 admin user named "Sandeepkumarduli"
- Click on the **tournaments** table, and you should see 1 tournament "Erangel - Solo"
- Click on the **notifications** table, and you should see 6 broadcast notifications

## Troubleshooting

### If you encounter SQL errors:
1. Make sure you're running the entire script at once
2. Check for any error messages in the Supabase SQL Editor
3. If specific tables are causing issues, you can try running parts of the script incrementally

### If tables are created but data import fails:
1. You can manually insert the data using the Table Editor interface
2. For the admin user, make sure to use the exact same values as in the SQL script, especially for the password hash

### If you need to verify database connectivity from the application:
1. Use the diagnostic endpoint at `/api/admin/db-status` to check connectivity
2. Make sure the NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables are correctly set
3. Restart the application server after updating environment variables

## Post-Migration Steps

After successfully running the migration:

1. **Test Authentication**: Try logging in with the admin account (Sandeepkumarduli)
2. **Verify Phone OTP Verification**: Test the phone verification workflow
3. **Check Tournament Display**: Verify that the Erangel-Solo tournament appears correctly
4. **Check Notifications**: Verify that broadcast notifications are displayed

## Rollback Instructions (If Needed)

If you need to revert the migration:

1. Use the SQL Editor in Supabase
2. Drop all tables with the following command:
```sql
DROP TABLE IF EXISTS "notification_reads" CASCADE;
DROP TABLE IF EXISTS "notifications" CASCADE;
DROP TABLE IF EXISTS "registrations" CASCADE;
DROP TABLE IF EXISTS "team_members" CASCADE;
DROP TABLE IF EXISTS "teams" CASCADE;
DROP TABLE IF EXISTS "tournaments" CASCADE;
DROP TABLE IF EXISTS "profiles" CASCADE;
```

3. Then re-run the migration script to start fresh