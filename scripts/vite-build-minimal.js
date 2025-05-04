/**
 * Minimal build script for the client-side application
 */
import { build } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function buildClient() {
  console.log('🚀 Starting minimal client build...');
  
  try {
    // Ensure dist directory exists
    const distDir = path.join(rootDir, 'dist');
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir);
    }
    
    // Apply minimal configuration to reduce build size
    await build({
      root: path.join(rootDir, 'client'),
      build: {
        outDir: path.join(rootDir, 'dist/public'),
        emptyOutDir: true,
        minify: true,
        // Limit chunks to improve build speed
        rollupOptions: {
          output: {
            manualChunks: undefined
          }
        },
        // Avoid chunks for dependencies
        cssCodeSplit: true,
        chunkSizeWarningLimit: 1000
      },
      // Disable source maps for production
      logLevel: 'info',
      // Important settings to make the build work on Replit
      define: {
        'process.env.NODE_ENV': JSON.stringify('production')
      }
    });
    
    console.log('✅ Client build completed successfully!');
    
    // Show the contents of the dist directory
    const publicDir = path.join(distDir, 'public');
    if (fs.existsSync(publicDir)) {
      console.log('📂 Files in dist/public:');
      const files = fs.readdirSync(publicDir);
      files.forEach(file => {
        console.log(`  - ${file}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Client build failed:', error);
    process.exit(1);
  }
}

// Run the build
buildClient();