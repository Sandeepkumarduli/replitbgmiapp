/**
 * Secure Admin User Setup
 * 
 * This file creates or checks for the admin user in the database.
 * It should only be called by trusted server-side code, never from client-side.
 */

import { supabase } from './supabase.js';
import { hashPassword } from './auth.js';

/**
 * Creates an admin user if one doesn't already exist
 * @returns {Promise<{success: boolean, message: string, admin?: any}>}
 */
async function createOrVerifyAdminUser() {
  console.log('Checking for admin user...');
  
  try {
    // Check if admin already exists in admins table
    const { data: existingAdmin, error: checkError } = await supabase
      .from('admins')
      .select('*')
      .eq('username', 'admin')
      .limit(1);
    
    if (!checkError && existingAdmin && existingAdmin.length > 0) {
      console.log('Admin user already exists in admins table.');
      return {
        success: true,
        message: 'Admin user already exists in admins table',
        admin: {
          id: existingAdmin[0].id,
          username: existingAdmin[0].username,
          role: existingAdmin[0].role
        }
      };
    }
    
    // If admin doesn't exist, create one
    console.log('Creating admin user...');
    const hashedPassword = await hashPassword('admin123');
    
    const { data: newAdmin, error } = await supabase
      .from('admins')
      .insert({
        username: 'admin',
        password: hashedPassword,
        email: 'admin@example.com',
        phone: '1234567890',
        display_name: 'System Admin',
        access_level: 'admin',
        role: 'admin',
        is_active: true
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating admin user:', error);
      
      // Try using run_sql as a fallback if the insert fails
      try {
        console.log('Attempting to create admin using run_sql...');
        const { data, error: sqlError } = await supabase.rpc('run_sql', {
          sql_query: `
            INSERT INTO admins (
              username, password, email, phone, display_name, access_level, role, is_active
            ) VALUES (
              'admin', 
              '${hashedPassword}', 
              'admin@example.com', 
              '1234567890', 
              'System Admin', 
              'admin', 
              'admin', 
              true
            )
            ON CONFLICT (username) DO NOTHING
            RETURNING id, username, role;
          `
        });
        
        if (sqlError) {
          console.error('Error creating admin user with run_sql:', sqlError);
          return {
            success: false,
            message: `Failed to create admin user: ${sqlError.message}`
          };
        }
        
        if (!data || data.length === 0) {
          return {
            success: false,
            message: 'No admin user was created'
          };
        }
        
        console.log('Admin user created successfully via run_sql');
        return {
          success: true,
          message: 'Admin user created successfully via run_sql',
          admin: data[0]
        };
      } catch (sqlErr) {
        console.error('Exception creating admin with run_sql:', sqlErr);
        return {
          success: false,
          message: `Exception creating admin: ${sqlErr.message}`
        };
      }
    }
    
    console.log('Admin user created successfully');
    return {
      success: true,
      message: 'Admin user created successfully',
      admin: {
        id: newAdmin.id,
        username: newAdmin.username,
        role: newAdmin.role
      }
    };
  } catch (err) {
    console.error('Exception checking/creating admin user:', err);
    return {
      success: false,
      message: `Exception: ${err.message}`
    };
  }
}

// Check if this file is being run directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  console.log('Running admin setup directly...');
  createOrVerifyAdminUser()
    .then(result => {
      console.log('Result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Unhandled error:', err);
      process.exit(1);
    });
}

// Export for use in other modules
export {
  createOrVerifyAdminUser
};