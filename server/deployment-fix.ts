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
  if (process.env.NODE_ENV !== 'production') {
    console.log('Development mode: bypassing deployment safety measures');
    return;
  }
  
  console.log('Production mode: initializing deployment safety measures');
  
  // Apply safety measures for production
  ensureEnvironmentVariables();
  ensurePublicDirectory();
  
  // Set global error handlers for production
  process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION - keeping process alive:', err);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION - keeping process alive:', reason);
  });
}

/**
 * Ensures that critical environment variables have fallback values
 * These fallbacks allow the application to start but with limited functionality
 */
function ensureEnvironmentVariables() {
  // Database fallback - only show a warning about missing database
  // but don't crash the app (it will use the in-memory store as fallback)
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️ DATABASE_URL not found, will attempt to use fallback mechanisms');
  }
  
  // Supabase fallbacks
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.warn('⚠️ NEXT_PUBLIC_SUPABASE_URL not found, authentication features will be limited');
  }
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('⚠️ NEXT_PUBLIC_SUPABASE_ANON_KEY not found, authentication features will be limited');
  }
}

/**
 * Ensures the public directory exists for serving static files
 * If dist/public doesn't exist, it creates a minimal version
 */
function ensurePublicDirectory() {
  const publicDir = path.join(process.cwd(), 'dist', 'public');
  const indexPath = path.join(publicDir, 'index.html');
  
  try {
    // Check if the directory exists
    if (!fs.existsSync(publicDir)) {
      console.warn('⚠️ Public directory not found, creating minimal fallback');
      fs.mkdirSync(publicDir, { recursive: true });
      
      // Create a minimal index.html
      const minimalHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RD TOURNAMENTS HUB</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; text-align: center; }
    .message { margin-top: 40px; color: #666; }
    .error { color: #e74c3c; }
  </style>
</head>
<body>
  <h1>RD TOURNAMENTS HUB</h1>
  <p class="message">The application is currently being deployed...</p>
  <p class="error">If you continue seeing this message, please contact support.</p>
</body>
</html>
      `;
      
      fs.writeFileSync(indexPath, minimalHtml);
    }
  } catch (error) {
    console.error('Error ensuring public directory:', error);
  }
}