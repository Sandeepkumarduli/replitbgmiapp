/**
 * Pre-deployment checks script
 * This script verifies all necessary environment variables and dependencies
 * before deployment to avoid blank screens in production
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n=== 🚀 PRE-DEPLOYMENT CHECKS ===\n');

// Function to check environment variables
function checkEnvironmentVariables() {
  console.log('📝 Checking environment variables...');
  
  const requiredVars = [
    'DATABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ];
  
  let allPresent = true;
  
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      console.log(`  ✅ ${varName} is set`);
    } else {
      console.log(`  ❌ ${varName} is missing`);
      allPresent = false;
    }
  });
  
  if (!allPresent) {
    console.log('\n⚠️  Some environment variables are missing. The application might not work correctly in production.');
    console.log('   Make sure to set them in your Replit deployment environment.');
    console.log('   Deployment will continue but features requiring these variables may not work.');
  } else {
    console.log('  ✅ All required environment variables are present');
  }
  
  return allPresent;
}

// Check if essential directories exist
function checkDirectoryStructure() {
  console.log('\n📁 Checking directory structure...');
  
  const requiredDirs = [
    'client',
    'server',
    'shared'
  ];
  
  let allPresent = true;
  
  requiredDirs.forEach(dir => {
    if (fs.existsSync(path.join(__dirname, '..', dir))) {
      console.log(`  ✅ ${dir} directory exists`);
    } else {
      console.log(`  ❌ ${dir} directory is missing`);
      allPresent = false;
    }
  });
  
  return allPresent;
}

// Check if essential files exist
function checkEssentialFiles() {
  console.log('\n📄 Checking essential files...');
  
  const essentialFiles = [
    'package.json',
    'vite.config.ts',
    'server/index.ts',
    'client/index.html'
  ];
  
  let allPresent = true;
  
  essentialFiles.forEach(file => {
    if (fs.existsSync(path.join(__dirname, '..', file))) {
      console.log(`  ✅ ${file} exists`);
    } else {
      console.log(`  ❌ ${file} is missing`);
      allPresent = false;
    }
  });
  
  return allPresent;
}

// Run all checks
async function runAllChecks() {
  const envCheck = checkEnvironmentVariables();
  const dirCheck = checkDirectoryStructure();
  const fileCheck = checkEssentialFiles();
  
  console.log('\n=== 📊 CHECK SUMMARY ===');
  
  if (envCheck && dirCheck && fileCheck) {
    console.log('\n✅ All pre-deployment checks passed! Your app should deploy successfully.');
  } else {
    console.log('\n⚠️ Some checks failed. The app may experience issues in production.');
    console.log('   Review the warnings above and fix any issues before deploying.');
  }
  
  console.log('\n=============================\n');
}

// Run the checks
runAllChecks();