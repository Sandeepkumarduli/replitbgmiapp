/**
 * Build optimization script for Replit deployment
 * This script builds the client and server separately with optimized settings
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting optimized build process...');

// Step 1: Ensure dist directory exists
console.log('📁 Creating dist directory if it doesn\'t exist...');
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Step 2: Build client
console.log('🔨 Building client application...');
try {
  execSync('npx vite build', { stdio: 'inherit' });
  console.log('✅ Client build complete!');
} catch (error) {
  console.error('❌ Client build failed:', error.message);
  process.exit(1);
}

// Step 3: Build server
console.log('🔨 Building server application...');
try {
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', 
    { stdio: 'inherit' });
  console.log('✅ Server build complete!');
} catch (error) {
  console.error('❌ Server build failed:', error.message);
  process.exit(1);
}

// Step 4: Verify the build
console.log('🔍 Verifying build...');
const distPublicPath = path.join('dist', 'public');
const indexJsPath = path.join('dist', 'index.js');

if (fs.existsSync(distPublicPath) && fs.existsSync(indexJsPath)) {
  console.log('✅ Build verified successfully!');
  
  // List files in dist/public
  console.log('📂 Files in dist/public:');
  const files = fs.readdirSync(distPublicPath);
  files.forEach(file => {
    console.log(`  - ${file}`);
  });
  
  console.log('\n🎉 Build completed successfully! Ready for deployment.');
} else {
  console.error('❌ Build verification failed. Missing required files.');
  process.exit(1);
}