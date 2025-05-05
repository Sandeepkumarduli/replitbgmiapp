/**
 * Environment check utility
 * Use this to debug environment variable issues
 */
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export function checkEnvironmentVariables() {
  console.log('\n===== ENVIRONMENT VARIABLE CHECK =====\n');
  
  // Check for critical environment variables
  const criticalVars = [
    'DATABASE_URL',
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_APP_ID'
  ];
  
  console.log('Critical environment variables:');
  criticalVars.forEach(varName => {
    if (process.env[varName]) {
      const value = process.env[varName] as string;
      // Mask most of the value for security
      const maskedValue = value.length > 10 
        ? `${value.substring(0, 6)}...${value.substring(value.length - 4)}`
        : '******';
      console.log(`  ✅ ${varName}: ${maskedValue}`);
    } else {
      console.log(`  ❌ ${varName} is missing`);
    }
  });
  
  // Check for Node environment
  console.log('\nNode Environment:');
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  
  // Check if we're running in Vite's development mode
  console.log('\nVite Mode Detection:');
  const isViteDev = process.env.VITE_DEV === 'true';
  console.log(`  Is Vite Dev: ${isViteDev ? 'Yes' : 'No'}`);
  
  // Print all environment variables with VITE_ prefix (masked)
  // Removed NEXT_PUBLIC_ prefix (used by Supabase) as we're now using Neon DB
  console.log('\nClient-side environment variables:');
  Object.keys(process.env)
    .filter(key => key.startsWith('VITE_'))
    .forEach(key => {
      const value = process.env[key] as string;
      const maskedValue = value.length > 10 
        ? `${value.substring(0, 6)}...${value.substring(value.length - 4)}`
        : '******';
      console.log(`  ${key}: ${maskedValue}`);
    });
  
  console.log('\n======================================\n');
}

// Run the check immediately when imported
checkEnvironmentVariables();