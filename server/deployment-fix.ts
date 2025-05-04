/**
 * Special handling for deployment environment
 * This module adds enhancements to make deployment more resilient
 */

import fs from 'fs';
import path from 'path';

/**
 * Initializes deployment safety measures
 * This adds various fallbacks and error recovery for production
 */
export function initializeDeploymentSafety() {
  // Only run in production environments
  if (process.env.NODE_ENV !== 'production') {
    return;
  }
  
  console.log('🛡️ Initializing deployment safety measures');
  
  // Set default fallback values for critical environment variables if missing
  ensureEnvironmentVariables();
  
  // Check for public directory
  ensurePublicDirectory();
  
  console.log('✅ Deployment safety measures initialized');
}

/**
 * Ensures that critical environment variables have fallback values
 * These fallbacks allow the application to start but with limited functionality
 */
function ensureEnvironmentVariables() {
  // If no DATABASE_URL, use in-memory mode
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️ No DATABASE_URL provided, using fallback memory mode');
    process.env.USE_DATABASE = 'false';
  }
  
  // Ensure Supabase variables have fallbacks (but prevent crashes)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('⚠️ Supabase credentials missing, enabling fallback mode');
    // Don't set fake values, just make sure the app knows to use fallbacks
    process.env.USE_SUPABASE = 'false';
  }
}

/**
 * Ensures the public directory exists for serving static files
 * If dist/public doesn't exist, it creates a minimal version
 */
function ensurePublicDirectory() {
  const publicDir = path.join(process.cwd(), 'dist', 'public');
  
  if (!fs.existsSync(publicDir)) {
    console.warn('⚠️ Public directory missing, creating minimal fallback');
    
    // Create dist directory if it doesn't exist
    const distDir = path.join(process.cwd(), 'dist');
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }
    
    // Create public directory
    fs.mkdirSync(publicDir, { recursive: true });
    
    // Create a minimal index.html for emergency fallback
    const indexPath = path.join(publicDir, 'index.html');
    const fallbackHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>RD Tournaments Hub</title>
        <style>
          body { font-family: system-ui, sans-serif; display: flex; align-items: center; 
                justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: white; }
          .message { max-width: 500px; text-align: center; padding: 2rem; border-radius: 0.5rem; 
                    background: rgba(15, 23, 42, 0.8); box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          h1 { margin-top: 0; color: #38bdf8; }
          .loading { margin-top: 1.5rem; display: flex; justify-content: center; }
          .loading div { width: 12px; height: 12px; margin: 0 4px; background: #38bdf8;
                       border-radius: 50%; animation: loading 1.2s infinite ease-in-out; }
          .loading div:nth-child(2) { animation-delay: 0.2s; }
          .loading div:nth-child(3) { animation-delay: 0.4s; }
          @keyframes loading { 
            0%, 100% { transform: scale(0.6); opacity: 0.4; } 
            50% { transform: scale(1); opacity: 1; } 
          }
        </style>
      </head>
      <body>
        <div class="message">
          <h1>RD Tournaments Hub</h1>
          <p>The application is currently initializing. Please wait while we set things up...</p>
          <div class="loading"><div></div><div></div><div></div></div>
          <p>If you continue to see this message, please contact support.</p>
        </div>
        <script>
          // Auto-refresh to retry loading the application
          setTimeout(() => { window.location.reload(); }, 10000);
        </script>
      </body>
      </html>
    `;
    
    fs.writeFileSync(indexPath, fallbackHtml);
    console.log('✅ Created fallback index.html');
  }
}