# Complete Supabase Migration Plan

This document outlines the comprehensive plan for migrating the RD Tournaments Hub from PostgreSQL to Supabase, including technical details, data migration considerations, and post-migration verification steps.

## Overview

The migration involves transitioning the following components:
1. Database tables and data from PostgreSQL to Supabase
2. Authentication system from Firebase to Supabase Auth
3. Phone verification system to use Supabase OTP functionality

## Migration Components

### 1. Database Tables

The following tables need to be created in Supabase:

| Table Name | Description | Migration Priority |
|------------|-------------|-------------------|
| profiles | User accounts (renamed from 'users') | High |
| teams | Team information | High |
| team_members | Members of teams | High |
| tournaments | Tournament details | High |
| registrations | Tournament registrations | High |
| notifications | System notifications | Medium |
| notification_reads | Track which users read which notifications | Medium |

### 2. Essential Data to Preserve

The following critical data must be preserved during migration:

- **Admin Account**: Username "Sandeepkumarduli" with admin role
- **Tournament Data**: At least the "Erangel - Solo" tournament
- **Notification Data**: Existing system broadcast notifications (6 entries)

### 3. Authentication Changes

- Switch from Firebase Authentication to Supabase Auth
- Implement phone OTP verification using Supabase
- Update login/signup forms to work with Supabase Auth
- Modify session handling to work with Supabase session

## Technical Implementation

### Database Migration

The `complete_supabase_migration.sql` script handles:
1. Creating all required tables with proper schema
2. Setting up foreign key relationships
3. Importing essential data
4. Establishing Row Level Security policies

### Authentication Change

1. Use Supabase Auth's phone verification
2. Replace Firebase login/signup with Supabase Auth
3. Update session management to work with Supabase sessions

### Environment Variables

Ensure the following environment variables are correctly set:
- `NEXT_PUBLIC_SUPABASE_URL`: The URL of your Supabase project
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: The anon/public key for your Supabase project

## Post-Migration Verification

After migration, verify the following:

### 1. Database Functionality
- [ ] Check all tables exist in Supabase
- [ ] Verify admin account exists
- [ ] Verify tournament data exists
- [ ] Check database relationships work correctly

### 2. Authentication
- [ ] Test admin login
- [ ] Test user registration with phone verification
- [ ] Verify session persistence
- [ ] Test user logout

### 3. Application Features
- [ ] Admin can create/edit tournaments
- [ ] Users can register for tournaments
- [ ] Teams can be created and managed
- [ ] Notifications display correctly

## Rollback Plan

If critical issues arise post-migration:

1. Keep the original PostgreSQL database as a backup
2. Have SQL scripts ready to revert Supabase changes
3. Be prepared to switch back to Firebase authentication if needed

## Monitoring & Maintenance

After successful migration:

1. Monitor application performance with Supabase
2. Check Supabase logs for any errors
3. Verify all application features work with the new database
4. Set up regular backups of Supabase data

## Next Steps After Migration

1. Clean up any remaining Firebase references in the code
2. Optimize queries for Supabase
3. Consider implementing additional Supabase features like:
   - Realtime subscriptions for notifications
   - Storage for team/user images
   - Edge Functions for background processing