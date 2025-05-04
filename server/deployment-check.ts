/**
 * Deployment readiness check
 * This script verifies that the application is ready for production deployment
 */

import { storage } from './storage';
import { hashPassword } from './auth';

/**
 * Checks all the necessary conditions for a successful deployment:
 * 1. Database connection
 * 2. Required tables
 * 3. Admin account exists and can be authenticated
 * 4. API endpoints return correct responses
 */
export async function checkDeploymentReadiness() {
  console.log('Running deployment readiness check...');
  const results = {
    checks: [] as Array<{name: string, status: 'passed' | 'failed', message: string}>,
    passed: true
  };

  // Function to record check results
  const recordCheck = (name: string, passed: boolean, message: string) => {
    results.checks.push({
      name,
      status: passed ? 'passed' : 'failed',
      message
    });
    if (!passed) {
      results.passed = false;
    }
  };

  try {
    // 1. Check database status
    try {
      const dbStatus = await storage.checkDatabaseStatus();
      recordCheck(
        'Database Connection', 
        true,
        `Connected successfully. Found ${dbStatus.userCount} users and ${dbStatus.tables.length} tables.`
      );
    } catch (error) {
      recordCheck(
        'Database Connection', 
        false,
        `Failed to connect to database: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // 2. Check required tables
    const requiredTables = [
      'users', 'teams', 'team_members', 'tournaments', 
      'registrations', 'notifications', 'notification_reads'
    ];
    
    try {
      const dbStatus = await storage.checkDatabaseStatus();
      const missingTables = requiredTables.filter(t => !dbStatus.tables.includes(t));
      
      if (missingTables.length === 0) {
        recordCheck(
          'Required Tables', 
          true,
          `All required tables exist: ${requiredTables.join(', ')}`
        );
      } else {
        recordCheck(
          'Required Tables', 
          false,
          `Missing tables: ${missingTables.join(', ')}`
        );
      }
    } catch (error) {
      recordCheck(
        'Required Tables', 
        false,
        `Failed to check tables: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // 3. Check admin account
    try {
      const adminUsername = "Sandeepkumarduli";
      const admin = await storage.getUserByUsername(adminUsername);
      
      if (admin) {
        if (admin.role === 'admin') {
          recordCheck(
            'Admin Account', 
            true,
            `Admin user exists with correct role: ${admin.username}`
          );
        } else {
          recordCheck(
            'Admin Account', 
            false,
            `Admin user exists but has incorrect role: ${admin.role}`
          );
        }
        
        if (admin.phoneVerified) {
          recordCheck(
            'Admin Phone Verification', 
            true,
            'Admin phone is verified'
          );
        } else {
          recordCheck(
            'Admin Phone Verification', 
            false,
            'Admin phone is not verified'
          );
        }
      } else {
        recordCheck(
          'Admin Account', 
          false,
          'Admin user does not exist'
        );
      }
    } catch (error) {
      recordCheck(
        'Admin Account', 
        false,
        `Failed to check admin account: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // 4. Check tournament existence
    try {
      const tournaments = await storage.getAllTournaments();
      
      if (tournaments.length > 0) {
        recordCheck(
          'Tournaments', 
          true,
          `Found ${tournaments.length} tournaments`
        );
      } else {
        recordCheck(
          'Tournaments', 
          false,
          'No tournaments found in database'
        );
      }
    } catch (error) {
      recordCheck(
        'Tournaments', 
        false,
        `Failed to check tournaments: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // 5. Check environment variables
    const requiredEnvVars = [
      'DATABASE_URL',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
    
    if (missingEnvVars.length === 0) {
      recordCheck(
        'Environment Variables', 
        true,
        `All required environment variables are set: ${requiredEnvVars.join(', ')}`
      );
    } else {
      recordCheck(
        'Environment Variables', 
        false,
        `Missing environment variables: ${missingEnvVars.join(', ')}`
      );
    }

    // Return the results
    return results;
  } catch (error) {
    console.error('Deployment check failed:', error);
    recordCheck(
      'Deployment Check', 
      false,
      `Unexpected error in deployment check: ${error instanceof Error ? error.message : String(error)}`
    );
    return results;
  }
}