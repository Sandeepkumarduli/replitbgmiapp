# RD TOURNAMENTS HUB - Supabase Setup Guide

This guide will help you set up the necessary tables and configurations in your Supabase project for the RD TOURNAMENTS HUB application.

## Prerequisites

1. A Supabase account and project already created
2. The Supabase URL and anon key (which should already be configured as environment variables)

## Step 1: Create the Database Tables

1. Log in to your Supabase dashboard at https://app.supabase.com
2. Select your project
3. In the left sidebar, click on "SQL Editor"
4. Create a "New Query"
5. Copy the entire SQL from the `sql_migrations/create_all_tables.sql` file in this project
6. Paste it into the SQL Editor
7. Click "Run" to execute the SQL and create all the tables

This script will:
- Create all necessary tables for the application
- Set up the relationships between tables
- Create the hardcoded admin user (username: Sandeepkumarduli, password: Sandy@1234)
- Configure Row Level Security policies for data protection

## Step 2: Verify the Tables Were Created

1. In the Supabase dashboard, go to "Table Editor" in the left sidebar
2. You should see all the following tables:
   - users
   - teams
   - team_members
   - tournaments
   - registrations
   - notifications
   - notification_reads

3. To verify the admin user was created:
   - Click on the "users" table
   - You should see a user with username "Sandeepkumarduli"

## Step 3: Update Environment Variables (if needed)

The application should already have the necessary environment variables configured:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

If you need to change these, update them in your project's environment variables.

## Step 4: Test the Application

1. After completing the setup, restart the application
2. Try logging in with the admin credentials:
   - Username: Sandeepkumarduli
   - Password: Sandy@1234

## Troubleshooting

If you encounter any issues:

1. **Database Connection Issues**:
   - Verify your Supabase URL and anon key are correct
   - Check that the tables were created successfully in the Table Editor

2. **Authentication Issues**:
   - Ensure the admin user was created correctly
   - Try manually inserting the admin user through the Supabase Table Editor if the SQL script failed

3. **Table Structure Issues**:
   - Compare the table structure in Supabase with the schema defined in `shared/schema.ts`
   - Make sure all required fields have been created

For any other issues, check the application logs for detailed error messages.