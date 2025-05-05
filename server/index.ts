import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { scheduleBackups, initializeBackup } from "./backup";
import { scheduleTournamentStatusUpdates } from "./tournament-manager";
import { scheduleNotificationCleanup } from "./notification-manager";
import { initializeDeploymentSafety } from "./deployment-fix";
import dotenv from "dotenv";
import { checkSupabaseTables } from "./supabase-diagnostics";
import { runMigrations } from "./supabase-migration";

// Load environment variables
dotenv.config();

// Check environment variables (debug info)
import './env-check';

// Run database diagnostics and migrations
if (process.env.NODE_ENV === 'development') {
  // Only run these in development to avoid performance impact in production
  setTimeout(async () => {
    try {
      // Run Supabase migrations to ensure tables exist
      await runMigrations();
      
      // Run diagnostics to verify database state
      await checkSupabaseTables();
    } catch (error) {
      console.error('Error in database setup:', error);
    }
  }, 2000); // Delay to ensure server is started
}

// Initialize deployment safety measures (only takes effect in production)
initializeDeploymentSafety();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Improve API error handling
  // 1. Check for missing API endpoints
  // 2. Prevent HTML responses for API routes
  app.use((req, res, next) => {
    // Only proceed for API requests
    if (req.path.startsWith('/api/')) {
      // Store the original methods
      const originalSend = res.send;
      const originalEnd = res.end;
      const originalJson = res.json;
      
      // Override send to check for HTML responses in API routes
      res.send = function(body) {
        // Check if the response is HTML (common error case)
        if (typeof body === 'string' && 
            (body.includes('<!DOCTYPE') || body.includes('<html'))) {
          
          // Log the issue for debugging
          console.error(`HTML response detected for API route: ${req.path}`);
          
          // Reset headers if possible to avoid "headers already sent" errors
          if (!res.headersSent) {
            res.setHeader('Content-Type', 'application/json');
            
            // Replace HTML response with proper JSON error
            return originalJson.call(res, {
              error: 'API endpoint error',
              message: 'Server returned HTML instead of JSON',
              path: req.path
            });
          } else {
            console.error('Headers already sent, cannot convert HTML response to JSON');
          }
        }
        
        // Otherwise, proceed normally
        return originalSend.call(res, body);
      };
      
      // Override end to catch HTML strings
      // This needs to handle different function signatures
      const originalEndFunction = res.end;
      res.end = function(...args: any[]) {
        const chunk = args[0];
        
        if (chunk && typeof chunk === 'string' && 
            (chunk.includes('<!DOCTYPE') || chunk.includes('<html'))) {
          
          // Log the issue for debugging
          console.error(`HTML response detected in res.end for: ${req.path}`);
          
          // Try to replace with JSON if headers not sent
          if (!res.headersSent) {
            res.setHeader('Content-Type', 'application/json');
            const jsonResponse = JSON.stringify({
              error: 'API endpoint error',
              message: 'Server returned HTML instead of JSON',
              path: req.path
            });
            
            // Call the original end with the new JSON response
            return originalEndFunction.call(res, jsonResponse);
          }
        }
        
        // Call the original end with all original arguments
        return originalEndFunction.apply(res, args);
      };
      
      // Continue processing the request
      next();
    } else {
      next();
    }
  });

  // Importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Initialize backup system
    initializeBackup().then(() => {
      // Schedule automatic backups every 5 minutes
      scheduleBackups(5 * 60 * 1000);
      log('Data backup system initialized');
      
      // Schedule tournament status updates every minute
      scheduleTournamentStatusUpdates(60 * 1000);
      log('Tournament status updater initialized');
      
      // Schedule notification cleanup every 6 hours (delete notifications older than 1 day)
      scheduleNotificationCleanup(6 * 60 * 60 * 1000);
      log('Notification cleanup scheduler initialized');
    }).catch(err => {
      console.error('Failed to initialize backup system:', err);
    });
  });
})();
