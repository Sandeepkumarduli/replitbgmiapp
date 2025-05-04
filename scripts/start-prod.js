/**
 * Production server startup script
 * This script is used to start the server in production mode after it has been built
 */

// Check if the build files exist and guide user if they don't
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const serverFile = path.join(distDir, 'index.js');
const publicDir = path.join(distDir, 'public');

// Check if build files exist
if (!fs.existsSync(distDir) || !fs.existsSync(serverFile) || !fs.existsSync(publicDir)) {
  console.error('\x1b[31m%s\x1b[0m', '❌ Build files not found! Please run "npm run build" first.');
  console.log('\x1b[33m%s\x1b[0m', 'If you are seeing a blank screen after deployment, this means your build step failed.');
  console.log('\x1b[33m%s\x1b[0m', 'Try running the build manually with:');
  console.log('\x1b[36m%s\x1b[0m', '  npm run build');
  console.log('');
  process.exit(1);
}

// Inform user about successful checks
console.log('\x1b[32m%s\x1b[0m', '✅ Build files verified! Starting production server...');

// Now execute the actual production server file
require('../dist/index.js');