import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from 'express-session';
import { storage } from "./storage";
import { supabase } from "./supabase";
import { 
  Team,
  User,
  insertUserSchema,
  insertTeamSchema, 
  insertTeamMemberSchema, 
  insertTournamentSchema, 
  updateTournamentSchema,
  insertRegistrationSchema,
  insertNotificationSchema
} from "@shared/schema";
import { setupAuth, hashPassword } from "./auth";
import { setupSupabaseAuth } from "./supabase-auth";
import { registerSupabasePhoneAuthRoutes } from "./supabase-phone-auth";
import { checkDatabaseConnection, generateCreateTableSQL, getDirectDatabaseStatus, testRunSqlFunction } from "./db-check";
import { 
  setupSecurityMiddleware, 
  trackFailedLogin, 
  resetLoginAttempts, 
  enhancedAdminCheck,
  validateHardcodedAdmin,
  logSecurityEvent
} from "./auth-security";
import { WebSocketServer, WebSocket } from 'ws';
import { z } from "zod";
import crypto from "crypto";

// Function to generate a unique 6-digit team invite code
async function generate6DigitCode(storage: any): Promise<string> {
  // Generate a random 6-digit code
  const generateCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };
  
  // Try to generate a unique code up to 10 times
  let code = generateCode();
  let attempts = 0;
  let teamWithCode = null;
  
  while (attempts < 10) {
    try {
      // Check if the code already exists
      teamWithCode = await storage.getTeamByInviteCode(code);
      if (!teamWithCode) {
        return code; // Unique code found
      }
      // Generate a new code and try again
      code = generateCode();
      attempts++;
    } catch (error) {
      return code; // If there's an error checking the code, just return the current one
    }
  }
  
  // If we couldn't generate a unique code after 10 attempts, use a timestamp-based approach
  return `${Date.now().toString().slice(-6)}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Use fixed Supabase auth implementation to avoid conflicting endpoints
  console.log("Using Supabase storage (strictly enforced)");
  
  // Set up session middleware with proper configuration
  app.use(session({
    secret: 'bgmi-tournaments-secret',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: { 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));
  
  // Import the fixed auth implementation
  const { setupFixedAuth } = await import('./fixed-auth');
  
  // Setup authentication with middleware
  const { isAuthenticated, isAdmin } = setupFixedAuth(app);
    
  // Setup enhanced security middleware
  setupSecurityMiddleware(app);
  
  // Register Supabase phone authentication routes
  registerSupabasePhoneAuthRoutes(app);
  
  // Add diagnostic routes for debugging
  app.get('/api/check-supabase', async (req, res) => {
    try {
      console.log("Testing Supabase connection...");
      
      // Test direct Supabase connection
      console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log("Supabase Anon Key available:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      
      // Test direct Supabase API
      const { data: tableData, error: tableError } = await supabase
        .from('users')
        .select('*')
        .limit(5);
      
      console.log("Supabase query result:", { 
        error: tableError ? tableError.message : null,
        data: tableData || [],
        count: tableData?.length || 0
      });
        
      res.json({
        status: "Connection test complete",
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 15) + "...",
        supabaseConnection: !tableError ? "Success" : "Failed",
        tableQueryResult: tableError ? tableError.message : `Retrieved ${tableData?.length || 0} users`,
        records: tableData || []
      });
    } catch (error) {
      console.error("Supabase diagnostic error:", error);
      res.status(500).json({
        status: "Error",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null
      });
    }
  });
  
  app.get('/api/diagnostic/database', async (req, res) => {
    try {
      // @ts-ignore - checkDatabaseStatus may not be in IStorage interface
      const dbStatus = await storage.checkDatabaseStatus();
      
      // Get supabase status from the imported module
      const supabaseModule = await import('./supabase');
      
      // Also check database connection directly if possible
      let connectionStatus = "unknown";
      try {
        // Use the supabase client to check connection
        const { data, error } = await supabase.from('users').select('count(*)', { count: 'exact', head: true });
        connectionStatus = error ? "error: " + error.message : "connected";
      } catch (dbError) {
        connectionStatus = "error: " + (dbError instanceof Error ? dbError.message : String(dbError));
      }
      
      res.json({
        status: dbStatus?.status || 'unknown',
        userCount: dbStatus?.userCount || 0,
        tables: dbStatus?.tables || [],
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
        supabaseStatus: supabaseModule.supabase ? 'available' : 'unavailable',
        directConnectionStatus: connectionStatus,
        env: process.env.NODE_ENV
      });
    } catch (error) {
      console.error('Error in database diagnostic route:', error);
      res.status(500).json({ 
        error: 'Database diagnostic check failed',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Add session diagnostic endpoint to debug authentication issues
  // Add endpoint to provide Supabase credentials to the client
  app.get('/api/config/supabase', (req, res) => {
    res.json({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    });
  });
  
  // Add endpoint to check Supabase tables
  app.get('/api/diagnostic/supabase-tables', async (req, res) => {
    try {
      const { supabase } = await import('./supabase');
      
      if (!supabase) {
        return res.status(500).json({ 
          error: 'Supabase client not available',
          message: 'Could not access Supabase client' 
        });
      }
      
      // Get list of tables from Supabase using RPC
      const { data: tables, error } = await supabase.rpc('get_tables');
      
      if (error) {
        return res.status(500).json({ 
          error: 'Failed to get Supabase tables',
          message: error.message 
        });
      }
      
      // If the RPC function doesn't exist, fallback to checking known tables
      if (!tables) {
        const testTables = ['profiles', 'users', 'tournaments', 'teams', 'team_members', 
                           'registrations', 'notifications', 'notification_reads'];
        
        const tableResults = [];
        
        for (const table of testTables) {
          const { data, error } = await supabase
            .from(table)
            .select('count(*)', { count: 'exact', head: true });
          
          tableResults.push({
            name: table,
            exists: !error,
            count: data ? data.length : 0,
            error: error ? error.message : null
          });
        }
        
        return res.json({
          message: 'Tested tables using fallback method',
          tables: tableResults
        });
      }
      
      res.json({
        message: 'Retrieved Supabase tables',
        tables
      });
    } catch (error) {
      console.error('Error checking Supabase tables:', error);
      res.status(500).json({
        error: 'Failed to check Supabase tables',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Add schema diagnostic endpoint to check database structure
  app.get('/api/diagnostic/schema', async (req, res) => {
    try {
      // Define required tables based on our schema
      const requiredTables = [
        'users', 'teams', 'team_members', 'tournaments', 
        'registrations', 'notifications', 'notification_reads'
      ];
      
      // Use Supabase to check tables
      const existingTables = [];
      const tableSchemas = [];
      
      for (const table of requiredTables) {
        try {
          // Check if table exists by trying to get count
          const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
          
          if (!error) {
            existingTables.push(table);
            
            // Add table schema info
            tableSchemas.push({
              name: table,
              recordCount: count || 0,
              columns: [] // We don't have easy access to column info in Supabase JS client
            });
          }
        } catch (tableError) {
          console.error(`Error checking table ${table}:`, tableError);
        }
      }
      
      // Check which required tables are missing
      const missingTables = requiredTables.filter(t => !existingTables.includes(t));
      
      res.json({
        existingTables,
        missingTables,
        tableSchemas,
        env: process.env.NODE_ENV,
        supabaseUrl: 'configured', // We don't show the actual URL for security
        supabaseStatus: 'available'
      });
    } catch (error) {
      console.error('Error in schema diagnostic:', error);
      res.status(500).json({
        error: 'Schema diagnostic failed',
        message: error instanceof Error ? error.message : String(error),
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
        supabaseStatus: 'error'
      });
    }
  });

  app.get('/api/diagnostic/session', async (req, res) => {
    try {
      res.json({
        sessionExists: req.session ? true : false,
        sessionId: req.sessionID || 'none',
        userId: req.session?.userId || 'none',
        role: req.session?.role || 'none',
        username: req.session?.username || 'none',
        authenticated: req.session && req.session.userId ? true : false,
        cookies: req.headers.cookie || 'none'
      });
    } catch (error) {
      console.error('Error in session diagnostic route:', error);
      res.status(500).json({
        error: 'Session diagnostic check failed',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Deployment readiness check endpoint
  app.get('/api/diagnostic/deployment-check', async (req, res) => {
    try {
      if (process.env.NODE_ENV !== 'production') {
        // Import the check function
        const { checkDeploymentReadiness } = await import('./deployment-check');
        const results = await checkDeploymentReadiness();
        
        res.json(results);
      } else {
        // Disabled in production for security
        res.status(403).json({
          error: "Unauthorized",
          message: "This endpoint is only available in development mode"
        });
      }
    } catch (error) {
      console.error('Error running deployment check:', error);
      res.status(500).json({
        error: "Failed to run deployment check",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Direct database check endpoint
  app.get('/api/diagnostic/db-check', async (req, res) => {
    try {
      // First call our checkDatabaseConnection function to log diagnostics
      await checkDatabaseConnection();
      
      // Then get direct database status for the response
      const status = await getDirectDatabaseStatus();
      
      // Generate the SQL for creating tables
      const sql = generateCreateTableSQL();
      
      res.json({
        ...status,
        sqlScript: 'SQL script generated in server console',
        message: 'Tables must be created manually in Supabase dashboard using SQL Editor'
      });
    } catch (error) {
      console.error('Error checking database:', error);
      res.status(500).json({
        error: 'Database check failed',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Test the Supabase run_sql function
  app.get('/api/diagnostic/test-run-sql', async (_req, res) => {
    try {
      const result = await testRunSqlFunction();
      res.json(result);
    } catch (error) {
      console.error('Error testing run_sql function:', error);
      res.status(500).json({ 
        error: 'Failed to test run_sql function',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Get SQL for create functions needed in Supabase
  app.get('/api/diagnostic/sql-functions', async (_req, res) => {
    try {
      const sqlScript = generateExecuteSqlFunction();
      res.json({
        message: "These SQL functions need to be created in the Supabase SQL Editor",
        sqlScript
      });
    } catch (error) {
      console.error('Error generating SQL function script:', error);
      res.status(500).json({ 
        error: 'Failed to generate SQL function script',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Direct diagnostic route to check if admin account exists
  app.get('/api/diagnostic/admin', async (req, res) => {
    try {
      const adminUsername = "Sandeepkumarduli";
      const adminEmail = "admin@bgmi-tournaments.com";
      
      // Check with both methods to be thorough
      const adminByUsername = await storage.getUserByUsername(adminUsername);
      const adminByEmail = await storage.getUserByEmail(adminEmail);
      
      res.json({
        adminExists: !!(adminByUsername || adminByEmail),
        adminByUsername: !!adminByUsername,
        adminByEmail: !!adminByEmail,
        message: (adminByUsername || adminByEmail) ? "Admin user found in database" : "No admin user found in database"
      });
    } catch (error) {
      console.error("Admin check error:", error);
      res.status(500).json({
        error: "Failed to check admin",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Direct diagnostic route for admin account (does not require login)
  app.get('/api/diagnostic/check-admin', async (req, res) => {
    try {
      const adminUsername = "Sandeepkumarduli";
      
      // Check if admin exists
      const adminUser = await storage.getUserByUsername(adminUsername);
      
      if (adminUser) {
        res.json({
          status: "success",
          message: "Admin account exists",
          admin: {
            id: adminUser.id,
            username: adminUser.username,
            role: adminUser.role,
            email: adminUser.email
          }
        });
      } else {
        // Try creating admin directly for testing with direct Supabase access
        try {
          const { hashPassword } = await import('./auth');
          const hashedPassword = await hashPassword("Sandy@1234");
          
          console.log("Attempting to create admin account in diagnostic mode");
          
          // Try direct Supabase insert first
          const { data: newAdmin, error: insertError } = await supabase
            .from('users')
            .insert({
              username: adminUsername,
              password: hashedPassword,
              email: "admin@bgmi-tournaments.com",
              phone: "1234567890",
              gameId: "admin",
              role: "admin",
              phoneVerified: true,
              phoneVerificationBypassed: true,
              firebaseUid: null,
              createdAt: new Date()
            })
            .select()
            .single();
            
          if (insertError) {
            console.error("Direct insert error:", insertError);
            throw new Error(insertError.message);
          }
          
          if (!newAdmin) {
            throw new Error("No admin account returned after insert");
          }
          
          res.json({
            status: "success",
            message: "Admin account created directly via Supabase",
            admin: {
              id: newAdmin.id,
              username: newAdmin.username,
              role: newAdmin.role,
              email: newAdmin.email
            }
          });
        } catch (createError) {
          console.error("Diagnostic admin creation failed:", createError);
          res.status(500).json({
            status: "error",
            message: "Failed to create admin account",
            error: createError instanceof Error ? createError.message : String(createError)
          });
        }
      }
    } catch (error) {
      console.error("Admin check diagnostic error:", error);
      res.status(500).json({
        status: "error",
        message: "Admin check failed",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Special admin account repair route
  app.post('/api/diagnostic/repair-admin', async (req, res) => {
    try {
      // Only allow in development mode for security
      if (process.env.NODE_ENV !== 'production') {
        const adminUsername = "Sandeepkumarduli";
        const adminEmail = "admin@bgmi-tournaments.com";
        
        // Attempt to find the admin user
        let adminUser = await storage.getUserByUsername(adminUsername);
        
        if (!adminUser) {
          // Try by email as fallback
          adminUser = await storage.getUserByEmail(adminEmail);
        }
        
        if (adminUser) {
          // Fix admin account issues
          const updatedAdmin = await storage.updateUser(adminUser.id, {
            phoneVerified: true,
            phoneVerificationBypassed: true,
            role: "admin" // Ensure admin role is set
          });
          
          // Hash admin password if it's not already hashed
          if (!adminUser.password.includes('.')) {
            console.log('Fixing admin password hash...');
            const { hashPassword } = await import('./auth');
            const hashedPassword = await hashPassword("Sandy@1234");
            
            await storage.updateUser(adminUser.id, {
              password: hashedPassword
            });
          }
          
          res.json({
            success: true,
            message: "Admin account repaired successfully",
            admin: {
              id: adminUser.id,
              username: adminUser.username,
              role: adminUser.role,
              phoneVerified: true
            }
          });
        } else {
          // Admin not found, create one
          console.log('Admin not found, creating new admin account...');
          const { hashPassword } = await import('./auth');
          const hashedPassword = await hashPassword("Sandy@1234");
          
          const newAdmin = await storage.createUser({
            username: adminUsername,
            password: hashedPassword,
            email: adminEmail,
            phone: "1234567890",
            gameId: "admin",
            role: "admin",
            phoneVerified: true,
            phoneVerificationBypassed: true
          });
          
          res.json({
            success: true,
            message: "Admin account created successfully",
            admin: {
              id: newAdmin.id,
              username: newAdmin.username,
              role: newAdmin.role,
              phoneVerified: true
            }
          });
        }
      } else {
        // In production, this endpoint is disabled
        res.status(403).json({
          error: "Unauthorized",
          message: "This endpoint is only available in development mode"
        });
      }
    } catch (error) {
      console.error('Error repairing admin account:', error);
      res.status(500).json({
        error: "Failed to repair admin account",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Add a special diagnostics route for the admin account details
  app.get('/api/diagnostic/admin-details', async (req, res) => {
    try {
      // Only allow in development or with proper auth in production
      if (process.env.NODE_ENV !== 'production' || 
          (req.session?.role === 'admin' && req.session?.userId)) {
        
        // Check if admin exists
        const adminUsername = "Sandeepkumarduli";
        const adminEmail = "admin@bgmi-tournaments.com";
        
        const adminByUsername = await storage.getUserByUsername(adminUsername);
        const adminByEmail = adminEmail ? await storage.getUserByEmail(adminEmail) : null;
        
        // Determine which admin record to use
        const adminUser = adminByUsername || adminByEmail;
        
        if (adminUser) {
          // Return sanitized admin data
          const { password, ...adminInfo } = adminUser;
          
          res.json({
            adminExists: true,
            adminInfo: {
              ...adminInfo,
              password: '[REDACTED]'  // Never expose the actual password
            },
            matchingUsernames: adminByUsername ? true : false,
            matchingEmails: adminByEmail ? true : false
          });
        } else {
          res.json({
            adminExists: false,
            adminByUsername: !!adminByUsername,
            adminByEmail: !!adminByEmail,
            message: 'No admin user found in database'
          });
        }
      } else {
        // Not authorized for this diagnostic
        res.status(403).json({
          error: 'Not authorized',
          message: 'You must be an admin to access this diagnostic'
        });
      }
    } catch (error) {
      console.error('Error in admin diagnostic route:', error);
      res.status(500).json({
        error: 'Admin diagnostic check failed',
        message: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV !== 'production' ? (error as Error).stack : undefined
      });
    }
  });
  
  // Development-only route to create a test user if database is empty
  if (process.env.NODE_ENV === 'development') {
    app.post('/api/diagnostic/create-test-user', async (req, res) => {
      try {
        // Check if we already have users
        const allUsers = await storage.getAllUsers();
        
        if (allUsers.length > 0) {
          return res.json({
            message: 'Users already exist in the database',
            userCount: allUsers.length,
            users: allUsers.map(u => ({ id: u.id, username: u.username, role: u.role, phone: u.phone }))
          });
        }
        
        // Create an admin user
        const hashedPassword = await hashPassword('admin123');
        const adminUser = await storage.createUser({
          username: 'admin',
          password: hashedPassword,
          email: 'admin@bgmitournaments.com',
          role: 'admin',
          phone: '+919876543210',
          phoneVerified: true,
          gameId: 'ADMIN001'
        });
        
        // Create a regular user
        const hashedUserPassword = await hashPassword('user123');
        const regularUser = await storage.createUser({
          username: 'user',
          password: hashedUserPassword,
          email: 'user@bgmitournaments.com',
          role: 'user',
          phone: '+919876543211',
          phoneVerified: true,
          gameId: 'USER001'
        });
        
        res.json({
          message: 'Test users created successfully',
          users: [
            { id: adminUser.id, username: adminUser.username, role: adminUser.role, phone: adminUser.phone },
            { id: regularUser.id, username: regularUser.username, role: regularUser.role, phone: regularUser.phone }
          ]
        });
      } catch (error) {
        console.error('Error creating test users:', error);
        res.status(500).json({
          error: 'Failed to create test users',
          message: error instanceof Error ? error.message : String(error)
        });
      }
    });
  }
  
  // Enhanced Admin Check middleware for high-security routes
  const isEnhancedAdmin = async (req: Request, res: Response, next: NextFunction) => {
    // Development mode bypass for debugging - allows unrestricted access in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: Completely bypassing admin security checks');
      
      // Set a mock admin session if none exists
      if (!req.session) {
        console.log('Warning: No session object available');
      } else if (!req.session.userId) {
        console.log('Setting mock admin session for development');
        req.session.userId = 1; // Mock admin ID
        req.session.role = 'admin';
        req.session.username = 'dev_admin';
      }
      
      return next();
    }
    
    // PRODUCTION MODE - normal security checks
    
    // Log the access attempt for diagnostics
    console.log('Admin route accessed with session:', 
      req.session ? 
      { id: req.session.id, userId: req.session.userId, role: req.session.role } : 
      'No session'
    );
    
    // First check if user is an admin (initial check)
    if (!req.session || !req.session.userId) {
      logSecurityEvent('Unauthorized admin access attempt (not authenticated)', req);
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Check specifically if the role is not admin
    if (req.session.role !== 'admin') {
      logSecurityEvent('Unauthorized admin access attempt (not admin role)', req);
      return res.status(403).json({ message: "Not authorized - admin role required" });
    }
    
    // Apply enhanced security checks for admin
    try {
      await enhancedAdminCheck(req, res, next);
    } catch (error) {
      console.error('Error in enhanced admin check:', error);
      return res.status(500).json({ message: "Security check failed" });
    }
  };

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error.format() });
      }
      
      const { username, email, phone } = result.data;
      
      // Check if username, email, or phone already exists
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      const user = await storage.createUser(result.data);
      
      // Set session
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;
      
      // Save session before sending response
      req.session.save((err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to create session" });
        }
        
        res.status(201).json({ 
          id: user.id, 
          username: user.username, 
          email: user.email,
          role: user.role
        });
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const loginSchema = z.object({
        username: z.string(),
        password: z.string(),
      });
      
      const result = loginSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error.format() });
      }
      
      const { username, password } = result.data;
      
      const user = await storage.getUserByUsername(username);
      
      // Check if user exists
      if (!user) {
        // Track failed login attempt for rate limiting
        trackFailedLogin(req);
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Special case for hardcoded admin in development or for backwards compatibility
      const isDevModeAdmin = process.env.NODE_ENV === "development" && 
                            user.role === "admin" && 
                            validateHardcodedAdmin(username, password);
                            
      // Check if password matches (either direct match for hardcoded admin or via secure comparison)
      const isDirectMatch = user.password === password;
      let isHashMatch = false;
      
      // Only try hash comparison if the password has the hash format (contains a dot)
      if (user.password.includes('.') && !isDirectMatch && !isDevModeAdmin) {
        try {
          // Import the function dynamically to avoid circular dependencies
          const { comparePasswords } = await import('./auth');
          isHashMatch = await comparePasswords(password, user.password);
        } catch (error) {
          console.error('Error comparing passwords:', error);
        }
      }
      
      if (!isDirectMatch && !isHashMatch && !isDevModeAdmin) {
        // Track failed login attempt for rate limiting
        trackFailedLogin(req);
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // For admin login, perform additional validation
      if (user.role === 'admin') {
        // Verify against hardcoded admin credentials for extra security
        if (!validateHardcodedAdmin(username, password)) {
          trackFailedLogin(req);
          return res.status(401).json({ message: "Invalid credentials" });
        }
      }
      
      // Reset failed login attempts
      resetLoginAttempts(req);
      
      // Set session
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;
      
      // Save session before sending response
      req.session.save((err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to create session" });
        }
        
        // Log successful login
        logSecurityEvent('login_success', req, { userId: user.id, role: user.role });
        
        res.json({ 
          id: user.id, 
          username: user.username, 
          email: user.email,
          role: user.role
        });
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const user = await storage.getUser(req.session.userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ 
        id: user.id, 
        username: user.username, 
        email: user.email,
        phone: user.phone,
        phoneVerified: user.phoneVerified,
        gameId: user.gameId,
        role: user.role
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Update user profile
  app.patch("/api/auth/profile", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const user = await storage.getUser(req.session.userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Create a schema for profile updates
      const updateProfileSchema = z.object({
        password: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        gameId: z.string().optional(),
      });
      
      const result = updateProfileSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error.format() });
      }
      
      // If updating email, check if it's already in use
      if (result.data.email && result.data.email !== user.email) {
        const existingEmail = await storage.getUserByEmail(result.data.email);
        if (existingEmail) {
          return res.status(400).json({ message: "Email already exists" });
        }
      }
      
      // Update the user in storage
      const updatedUser = await storage.updateUser(user.id, result.data);
      
      // Update session if needed
      if (updatedUser) {
        req.session.save((err) => {
          if (err) {
            return res.status(500).json({ message: "Error updating session" });
          }
          
          res.json({ 
            id: updatedUser.id, 
            username: updatedUser.username, 
            email: updatedUser.email,
            phone: updatedUser.phone,
            phoneVerified: updatedUser.phoneVerified,
            gameId: updatedUser.gameId,
            role: updatedUser.role
          });
        });
      } else {
        res.status(500).json({ message: "Failed to update profile" });
      }
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Team routes
  app.post("/api/teams", isAuthenticated, async (req, res) => {
    try {
      // Get the current user
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(req.session.userId as number);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if user has reached the limit of 3 teams
      const userTeams = await storage.getTeamsByOwnerId(req.session.userId as number);
      if (userTeams.length >= 3) {
        return res.status(400).json({ message: "You've reached the maximum limit of 3 teams per user" });
      }
      
      const result = insertTeamSchema.safeParse({
        ...req.body,
        ownerId: req.session.userId
      });
      
      if (!result.success) {
        return res.status(400).json({ message: result.error.format() });
      }
      
      const existingTeam = await storage.getTeamByName(result.data.name);
      if (existingTeam) {
        return res.status(400).json({ message: "Team name already exists" });
      }
      
      // Generate a unique invite code for the team
      const inviteCode = await generate6DigitCode(storage);
      
      // Create team with invite code
      const team = await storage.createTeam({
        ...result.data,
        inviteCode
      });
      
      // Automatically add the team creator as team captain
      await storage.addTeamMember({
        teamId: team.id,
        username: user.username,
        gameId: user.gameId,
        role: "captain"
      });
      
      res.status(201).json(team);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/teams/my", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get teams owned by user
      const ownedTeams = await storage.getTeamsByOwnerId(userId);
      
      // Get all teams
      const allTeams = await storage.getAllTeams();
      
      // Get all team members to find teams where user is a member
      const memberTeams: Team[] = [];
      
      for (const team of allTeams) {
        // Skip teams the user already owns
        if (ownedTeams.some(ownedTeam => ownedTeam.id === team.id)) {
          continue;
        }
        
        // Check if user is a member of this team
        const members = await storage.getTeamMembers(team.id);
        const isMember = members.some(member => member.username === user.username);
        
        if (isMember) {
          memberTeams.push(team);
        }
      }
      
      // Combine owned teams and member teams
      const combinedTeams = [...ownedTeams, ...memberTeams];
      
      res.json(combinedTeams);
    } catch (error) {
      console.error("Error fetching user teams:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/teams/:id", isAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const team = await storage.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      res.json(team);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get team by invite code
  app.get("/api/teams/code/:inviteCode", isAuthenticated, async (req, res) => {
    try {
      const inviteCode = req.params.inviteCode;
      const team = await storage.getTeamByInviteCode(inviteCode);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found with this invite code" });
      }
      
      res.json(team);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Join team by invite code
  app.post("/api/teams/join", isAuthenticated, async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { inviteCode } = req.body;
      if (!inviteCode) {
        return res.status(400).json({ message: "Invite code is required" });
      }
      
      // Find team by invite code
      const team = await storage.getTeamByInviteCode(inviteCode);
      if (!team) {
        return res.status(404).json({ message: "Team not found with this invite code" });
      }
      
      // Check if team already has 5 members (4 + 1 substitute)
      const members = await storage.getTeamMembers(team.id);
      if (members.length >= 5) {
        return res.status(400).json({ message: "Team is already full" });
      }
      
      // Check if user is already a member of this team
      const userAlreadyInTeam = members.some(member => member.username === user.username);
      if (userAlreadyInTeam) {
        return res.status(400).json({ message: "You are already a member of this team" });
      }
      
      // Add user to team
      const newMember = await storage.addTeamMember({
        teamId: team.id,
        username: user.username,
        gameId: user.gameId,
        role: "member"
      });
      
      res.status(201).json({
        member: newMember,
        team
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Team members routes
  app.post("/api/teams/:id/members", isAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const team = await storage.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      if (team.ownerId !== req.session.userId) {
        return res.status(403).json({ message: "You are not the owner of this team" });
      }
      
      const result = insertTeamMemberSchema.safeParse({
        ...req.body,
        teamId
      });
      
      if (!result.success) {
        return res.status(400).json({ message: result.error.format() });
      }
      
      // Check if team already has 5 members (4 + 1 substitute)
      const members = await storage.getTeamMembers(teamId);
      if (members.length >= 5) {
        return res.status(400).json({ message: "Team cannot have more than 5 members" });
      }
      
      // Check if the username exists
      const userExists = await storage.getUserByUsername(req.body.username);
      if (!userExists) {
        return res.status(404).json({ 
          message: `User '${req.body.username}' does not exist. They need to sign up first.`,
          code: "user_not_found"
        });
      }
      
      // Check if username and gameId are the same
      if (req.body.username === req.body.gameId) {
        return res.status(400).json({
          message: "Username and Game ID cannot be the same",
          code: "invalid_data"
        });
      }
      
      const member = await storage.addTeamMember(result.data);
      
      res.status(201).json(member);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/teams/:id/members", isAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const team = await storage.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      const members = await storage.getTeamMembers(teamId);
      
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/teams/members/:id", isAuthenticated, async (req, res) => {
    try {
      const memberId = parseInt(req.params.id);
      const teamMember = await storage.getTeamMember(memberId);
      
      if (!teamMember) {
        return res.status(404).json({ message: "Team member not found" });
      }
      
      const team = await storage.getTeam(teamMember.teamId);
      
      if (!team || team.ownerId !== req.session.userId) {
        return res.status(403).json({ message: "You are not the owner of this team" });
      }
      
      await storage.deleteTeamMember(memberId);
      
      res.json({ message: "Team member removed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.delete("/api/teams/:id", isAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const team = await storage.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      if (team.ownerId !== req.session.userId) {
        return res.status(403).json({ message: "You are not the owner of this team" });
      }
      
      // Delete all team members first
      const members = await storage.getTeamMembers(teamId);
      for (const member of members) {
        await storage.deleteTeamMember(member.id);
      }
      
      // Delete the team
      const deleted = await storage.deleteTeam(teamId);
      
      if (deleted) {
        res.json({ message: "Team deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete team" });
      }
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Tournament routes
  app.post("/api/tournaments", isAdmin, async (req, res) => {
    try {
      const result = insertTournamentSchema.safeParse({
        ...req.body,
        createdBy: req.session.userId
      });
      
      if (!result.success) {
        return res.status(400).json({ message: result.error.format() });
      }
      
      const tournament = await storage.createTournament(result.data);
      
      res.status(201).json(tournament);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/tournaments/:id", isAdmin, async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const tournament = await storage.getTournament(tournamentId);
      
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      
      const result = updateTournamentSchema.safeParse({
        id: tournamentId,
        ...req.body
      });
      
      if (!result.success) {
        return res.status(400).json({ message: result.error.format() });
      }
      
      const updatedTournament = await storage.updateTournament(tournamentId, result.data);
      
      // Check if room information was updated (roomId or password changed)
      const roomInfoUpdated = 
        (req.body.roomId && req.body.roomId !== tournament.roomId) || 
        (req.body.password && req.body.password !== tournament.password);
      
      // If room info was updated, create notifications for registered users
      if (roomInfoUpdated && updatedTournament) {
        try {
          // Get all registrations for this tournament
          const registrations = await storage.getRegistrationsByTournament(tournamentId);
          
          // Create notifications for each registered user
          let notificationCount = 0;
          
          for (const registration of registrations) {
            if (registration.userId) {
              await storage.createNotification({
                userId: registration.userId,
                title: `Room Info Updated - ${updatedTournament.title}`,
                message: `Room ID: ${updatedTournament.roomId || 'Not set'}, Password: ${updatedTournament.password || 'Not set'}`,
                type: "tournament",
                relatedId: tournamentId
              });
              notificationCount++;
            }
          }
          
          console.log(`Created ${notificationCount} room info notifications for tournament ${tournamentId}`);
        } catch (error) {
          console.error("Error creating room update notifications:", error);
          // Continue execution even if notifications fail
        }
      }
      
      res.json(updatedTournament);
    } catch (error) {
      console.error("Error updating tournament:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/tournaments", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      
      let tournaments;
      if (status) {
        tournaments = await storage.getTournamentsByStatus(status);
      } else {
        tournaments = await storage.getAllTournaments();
      }
      
      res.json(tournaments);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/tournaments/:id", async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const tournament = await storage.getTournament(tournamentId);
      
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      
      res.json(tournament);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/tournaments/:id", isAdmin, async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const tournament = await storage.getTournament(tournamentId);
      
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      
      // Delete the tournament and all associated registrations
      try {
        await storage.deleteTournament(tournamentId);
        
        // Log this security-sensitive action
        logSecurityEvent('Admin deleted tournament', req, { 
          tournamentId,
          tournamentInfo: `Tournament #${tournamentId}`
        });
        
        res.json({ message: "Tournament deleted successfully" });
      } catch (deleteError) {
        console.error("Error deleting tournament:", deleteError);
        return res.status(500).json({ 
          message: "Failed to delete tournament", 
          error: "There might be data associated with this tournament that cannot be deleted. Please contact support."
        });
      }
    } catch (error) {
      console.error("Tournament delete error:", error);
      res.status(500).json({ 
        message: "Internal server error", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Registration routes
  app.post("/api/tournaments/:id/register", isAuthenticated, async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const userId = req.session.userId!;
      const teamId = parseInt(req.body.teamId);
      
      const tournament = await storage.getTournament(tournamentId);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      
      // Get tournament details and type (Squad, Duo, Solo)
      const tournamentType = tournament.teamType?.toLowerCase() || 'squad'; // Default to Squad if not specified
      
      // Check if team registration is needed (Solo tournaments don't need teams)
      if (tournamentType === 'solo') {
        // For Solo tournaments, the user registers directly without a team
        // Check if user is already registered
        const userRegistrations = await storage.getRegistrationsByUser(userId);
        const alreadyRegistered = userRegistrations.some(reg => reg.tournamentId === tournamentId);
        
        if (alreadyRegistered) {
          return res.status(400).json({ message: "You are already registered for this tournament" });
        }
        
        // Check if tournament is already full
        const registrations = await storage.getRegistrationsByTournament(tournamentId);
        if (registrations.length >= tournament.totalSlots) {
          return res.status(400).json({ message: "Tournament is already full" });
        }
        
        try {
          // For solo tournaments, let's use the team provided by the client
          // This ensures we meet the foreign key constraint
          // while still allowing solo tournament registrations
          if (!teamId) {
            return res.status(400).json({ message: "Team ID is required even for solo tournaments" });
          }

          // Verify this team belongs to the user
          const team = await storage.getTeam(teamId);
          if (!team) {
            return res.status(404).json({ message: "Team not found" });
          }
          
          // Check if user is a member or owner of the team
          if (team.ownerId !== userId) {
            const userIsMember = await storage.getTeamMembers(teamId)
              .then(members => members.some(member => member.userId === userId));
            
            if (!userIsMember) {
              return res.status(403).json({ message: "You are not a member of this team" });
            }
          }
          
          // Create registration with the verified team
          const soloRegistration = {
            tournamentId,
            userId,
            teamId, // Use the actual team ID
            slot: registrations.length + 1
          };
          
          const registration = await storage.createRegistration(soloRegistration);
          return res.status(201).json(registration);
        } catch (err) {
          console.error("Error creating solo registration:", err);
          return res.status(500).json({ 
            message: "Failed to register for solo tournament. Please try again.",
            error: err instanceof Error ? err.message : String(err)
          });
        }
      }
      
      // For Duo and Squad tournaments, proceed with team validation
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      // Check if user is a member of the team
      const userIsMember = await storage.getTeamMembers(teamId)
        .then(members => members.some(member => member.username === req.session.username));
      
      if (!userIsMember) {
        return res.status(403).json({ message: "You are not a member of this team" });
      }
      
      // Get team members to check team size
      const teamMembers = await storage.getTeamMembers(teamId);
      
      // Validate team size based on tournament type
      if (tournamentType === 'squad' && teamMembers.length < 4) {
        return res.status(400).json({ 
          message: "Squad tournaments require at least 4 team members", 
          currentSize: teamMembers.length,
          requiredSize: 4
        });
      } else if (tournamentType === 'duo' && teamMembers.length < 2) {
        return res.status(400).json({ 
          message: "Duo tournaments require at least 2 team members", 
          currentSize: teamMembers.length,
          requiredSize: 2
        });
      }
      
      // Check if tournament is already full
      const registrations = await storage.getRegistrationsByTournament(tournamentId);
      if (registrations.length >= tournament.totalSlots) {
        return res.status(400).json({ message: "Tournament is already full" });
      }
      
      // Check if team is already registered
      const isRegistered = await storage.checkRegistration(tournamentId, teamId);
      if (isRegistered) {
        return res.status(400).json({ message: "Team is already registered for this tournament" });
      }
      
      const result = insertRegistrationSchema.safeParse({
        tournamentId,
        teamId,
        userId
      });
      
      if (!result.success) {
        return res.status(400).json({ message: result.error.format() });
      }
      
      const registration = await storage.createRegistration(result.data);
      
      res.status(201).json(registration);
    } catch (error) {
      console.error("Tournament registration error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to register for tournament. Please try again." });
    }
  });

  app.get("/api/registrations/counts", async (req, res) => {
    try {
      // Get all tournaments
      const tournaments = await storage.getAllTournaments();
      
      // Create a map to store tournament ID -> registration count
      const counts: Record<number, number> = {};
      
      // Populate the counts for each tournament
      for (const tournament of tournaments) {
        const registrations = await storage.getRegistrationsByTournament(tournament.id);
        counts[tournament.id] = registrations.length;
      }
      
      res.json(counts);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/registrations/user", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const username = req.session.username!;
      
      // First, get all teams that the user is a member of
      const allTeams = await storage.getAllTeams();
      const userTeamIds = new Set<number>();
      
      // 1. Add teams the user owns
      const ownedTeams = await storage.getTeamsByOwnerId(userId);
      ownedTeams.forEach(team => userTeamIds.add(team.id));
      
      // 2. Add teams the user is a member of
      for (const team of allTeams) {
        const members = await storage.getTeamMembers(team.id);
        if (members.some(member => member.username === username)) {
          userTeamIds.add(team.id);
        }
      }
      
      // Now, get all registrations for all these teams
      let allRegistrations: any[] = [];
      
      // 1. Get registrations made by the user directly
      const userRegistrations = await storage.getRegistrationsByUser(userId);
      allRegistrations = [...userRegistrations];
      
      // 2. Get registrations for all teams the user is a member of
      // Convert Set to Array to avoid iteration issues
      const teamIdArray = Array.from(userTeamIds);
      for (const teamId of teamIdArray) {
        const teamRegistrations = await storage.getRegistrationsByTeam(teamId);
        // Avoid duplicates by checking if registration is already in the array
        for (const reg of teamRegistrations) {
          if (!allRegistrations.some(r => r.id === reg.id)) {
            allRegistrations.push(reg);
          }
        }
      }
      
      // Get additional information for each registration
      const result = await Promise.all(
        allRegistrations.map(async (registration) => {
          const tournament = await storage.getTournament(registration.tournamentId);
          const team = await storage.getTeam(registration.teamId);
          
          return {
            ...registration,
            tournament,
            team,
            // Add a flag to indicate if this registration was made by the current user
            isRegisteredByMe: registration.userId === userId
          };
        })
      );
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching user registrations:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Internal server error" });
    }
  });

  app.get("/api/tournaments/:id/registrations", async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const registrations = await storage.getRegistrationsByTournament(tournamentId);
      
      // Get team info for each registration
      const result = await Promise.all(
        registrations.map(async (registration) => {
          const team = await storage.getTeam(registration.teamId);
          return {
            ...registration,
            team
          };
        })
      );
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/registrations/:id", isAuthenticated, async (req, res) => {
    try {
      const registrationId = parseInt(req.params.id);
      const registration = await storage.getRegistration(registrationId);
      
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }
      
      if (registration.userId !== req.session.userId) {
        return res.status(403).json({ message: "You did not create this registration" });
      }
      
      try {
        await storage.deleteRegistration(registrationId);
        res.json({ message: "Registration canceled successfully" });
      } catch (deleteError) {
        console.error("Error deleting registration:", deleteError);
        return res.status(500).json({ 
          message: "Failed to cancel registration", 
          error: "There was an error processing your request. Please try again later."
        });
      }
    } catch (error) {
      console.error("Registration cancellation error:", error);
      res.status(500).json({ 
        message: "Internal server error", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Admin API routes - highly secured

  // Create a new user (admin only)
  app.post("/api/admin/users", isEnhancedAdmin, async (req, res) => {
    try {
      logSecurityEvent('Admin attempting to create user', req);
      
      const { username, email, password, phone, gameId, role = "user" } = req.body;
      
      // Validate required fields
      if (!username || !password || !email || !phone) {
        return res.status(400).json({ message: "Username, password, email and phone are required" });
      }
      
      // Prevent creating an account with hardcoded admin username
      if (username === "Sandeepkumarduli") {
        logSecurityEvent('Admin attempted to create system admin account', req);
        return res.status(400).json({ message: "This username is reserved" });
      }
      
      // Check if username already exists
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Hash password
      const hashedPassword = await hashPassword(password);
      
      // Create the user
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        email,
        phone,
        gameId: gameId || username, // Default gameId to username if not provided
        role
      });
      
      // Log the action
      logSecurityEvent('Admin created new user', req, {
        createdUserId: user.id,
        createdUsername: user.username,
        assignedRole: role
      });
      
      // Return the user without password
      const safeUser = { ...user, password: undefined };
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Error in POST /api/admin/users:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Create a new team (admin only)
  app.post("/api/admin/teams", isEnhancedAdmin, async (req, res) => {
    try {
      logSecurityEvent('Admin attempting to create team', req);
      
      const { name, ownerId, gameType } = req.body;
      
      // Validate required fields
      if (!name || !ownerId) {
        return res.status(400).json({ message: "Team name and owner ID are required" });
      }
      
      // Check if the owner exists
      const owner = await storage.getUser(ownerId);
      if (!owner) {
        return res.status(404).json({ message: "Owner not found" });
      }
      
      // Check if team name already exists
      const existingTeam = await storage.getTeamByName(name);
      if (existingTeam) {
        return res.status(400).json({ message: "Team name already exists" });
      }
      
      // Generate a unique 6-digit invite code
      const inviteCode = await generate6DigitCode(storage);
      
      // Create the team
      const team = await storage.createTeam({
        name,
        ownerId,
        gameType: gameType || 'BGMI', // Default to BGMI if not specified
        inviteCode
      });
      
      // Log the action
      logSecurityEvent('Admin created new team', req, {
        teamId: team.id,
        teamName: team.name,
        ownerId,
        ownerUsername: owner.username
      });
      
      res.status(201).json(team);
    } catch (error) {
      console.error("Error in POST /api/admin/teams:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get all users (admin only, with enhanced security)
  // Development mode admin access - skip the security check in development
  app.get("/api/admin/users", async (req, res) => {
    try {
      // Development mode direct access for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: Direct access to user list');
        
        // Get all users
        const users = await storage.getAllUsers();
        
        if (!users || users.length === 0) {
          console.log('No users found in database!');
        } else {
          console.log(`Found ${users.length} users in database`);
        }
        
        // Filter out sensitive information
        const safeUsers = users.map(user => ({
          ...user,
          password: undefined
        }));
        
        return res.json(safeUsers);
      }
      
      // Production mode uses enhanced security
      // First check if user is an admin - lightweight version of isEnhancedAdmin
      if (!req.session || !req.session.userId || req.session.role !== 'admin') {
        logSecurityEvent('Unauthorized admin access attempt to users list', req);
        return res.status(403).json({ message: "Not authorized" });
      }
      
      logSecurityEvent('Admin requested all users list', req);
      
      // Get all users
      const users = await storage.getAllUsers();
      
      // Filter out sensitive information
      const safeUsers = users.map(user => ({
        ...user,
        password: undefined
      }));
      
      res.json(safeUsers);
    } catch (error) {
      console.error('Error fetching admin users:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get all users (for notifications - admin only)
  app.get("/api/users", isAdmin, async (req, res) => {
    try {
      // Get all users
      const users = await storage.getAllUsers();
      
      // Filter out sensitive information
      const safeUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }));
      
      // Return as JSON array
      return res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({ 
        message: "Failed to fetch users",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Get all admin users (admin only, with enhanced security)
  app.get("/api/admin/users/admins", isEnhancedAdmin, async (req, res) => {
    try {
      logSecurityEvent('Admin requested admins list', req);
      // Get all users
      const users = await storage.getAllUsers();
      
      // Filter to only admins and remove sensitive information
      const safeAdmins = users
        .filter(user => user.role === 'admin')
        .map(user => ({
          ...user,
          password: undefined
        }));
      
      res.json(safeAdmins);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // New administrator management endpoints
  app.get("/api/admin/administrators", async (req, res) => {
    try {
      // Development mode direct access for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: Direct access to administrators list');
        
        // Get all users
        const users = await storage.getAllUsers();
        
        if (!users || users.length === 0) {
          console.log('No users found in database!');
        } else {
          console.log(`Found ${users.length} users in database, filtering for admins`);
        }
        
        // Filter to only admins, add activity data and remove sensitive information
        const administrators = users
          .filter(user => user.role === 'admin')
          .map(user => ({
            ...user,
            password: undefined,
            lastActive: new Date().toISOString(), // In a real app, this would come from activity tracking
            activityCount: Math.floor(Math.random() * 100) // Placeholder for demo
          }));
        
        console.log(`Found ${administrators.length} administrators`);
        return res.json(administrators);
      }
      
      // Production mode uses enhanced security
      if (!req.session || !req.session.userId || req.session.role !== 'admin') {
        logSecurityEvent('Unauthorized admin access attempt to administrators list', req);
        return res.status(403).json({ message: "Not authorized" });
      }
      
      logSecurityEvent('Admin requested administrators list', req);
      // Get all users
      const users = await storage.getAllUsers();
      
      // Filter to only admins, add activity data and remove sensitive information
      const administrators = users
        .filter(user => user.role === 'admin')
        .map(user => ({
          ...user,
          password: undefined,
          lastActive: new Date().toISOString(), // In a real app, this would come from activity tracking
          activityCount: Math.floor(Math.random() * 100) // Placeholder for demo
        }));
      
      res.json(administrators);
    } catch (error) {
      console.error("Error in /api/admin/administrators:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Revoke admin privileges
  app.patch("/api/admin/administrators/:id/revoke", isEnhancedAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Get the current admin's userId from the session
      const adminUserId = req.session.userId!;
      
      // Don't allow revoking own admin privileges
      if (userId === adminUserId) {
        logSecurityEvent('Admin attempted to revoke own privileges', req);
        return res.status(400).json({ message: "You cannot revoke your own admin privileges" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't allow modifying the hardcoded admin
      if (user.username === "Sandeepkumarduli") {
        logSecurityEvent('Admin attempted to modify system admin privileges', req, { targetUser: user.username });
        return res.status(403).json({ message: "Cannot modify system administrator account" });
      }
      
      // Check if user is actually an admin
      if (user.role !== 'admin') {
        return res.status(400).json({ message: "User is not an administrator" });
      }
      
      // Change role from admin to regular user
      const updatedUser = await storage.updateUser(userId, { role: "user" });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to revoke admin privileges" });
      }
      
      logSecurityEvent('Admin privileges revoked', req, {
        adminId: adminUserId, 
        targetUserId: userId,
        targetUsername: user.username
      });
      
      res.json({
        ...updatedUser,
        password: undefined
      });
    } catch (error) {
      console.error("Error in /api/admin/administrators/revoke:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get user by ID (admin only)
  app.get("/api/admin/users/:id", isEnhancedAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove sensitive information
      const safeUser = { ...user, password: undefined };
      
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Update user role (admin only, with enhanced security)
  app.patch("/api/admin/users/:id/role", isEnhancedAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Get the current admin's userId from the session
      const adminUserId = req.session.userId!;
      
      // Don't allow modifying own role
      if (userId === adminUserId) {
        logSecurityEvent('Admin attempted to modify own role', req);
        return res.status(400).json({ message: "You cannot modify your own role" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't allow modifying the hardcoded admin
      if (user.username === "Sandeepkumarduli") {
        logSecurityEvent('Admin attempted to modify system admin role', req, { targetUser: user.username });
        return res.status(403).json({ message: "Cannot modify system administrator account" });
      }
      
      // Validate role
      const roleSchema = z.object({
        role: z.enum(["user", "admin"])
      });
      
      const result = roleSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      // Update the user role
      const updatedUser = await storage.updateUser(userId, { role: result.data.role });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update user role" });
      }
      
      // Log this security-sensitive action
      logSecurityEvent('Admin updated user role', req, {
        targetUserId: userId,
        newRole: result.data.role
      });
      
      // Return updated user without password
      const safeUser = { ...updatedUser, password: undefined };
      
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Delete user (admin only)
  app.delete("/api/admin/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Check if user is admin
      if (!req.session || !req.session.role || req.session.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized: Admin access required" });
      }
      
      // Get the current admin's userId from the session
      const adminUserId = req.session.userId;
      
      // Don't allow deleting own account
      if (userId === adminUserId) {
        console.log('Admin attempted to delete own account', { adminId: adminUserId });
        return res.status(400).json({ message: "You cannot delete your own account" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't allow deleting the hardcoded admin
      if (user.username === "Sandeepkumarduli") {
        console.log('Admin attempted to delete system admin account', { targetUser: user.username });
        return res.status(403).json({ message: "Cannot delete system administrator account" });
      }

      try {
        // First, delete any teams owned by this user
        const userTeams = await storage.getTeamsByOwnerId(userId);
        for (const team of userTeams) {
          // Delete team members first
          const members = await storage.getTeamMembers(team.id);
          for (const member of members) {
            await storage.deleteTeamMember(member.id);
          }
          
          // Then delete the team
          await storage.deleteTeam(team.id);
        }
        
        // Delete any user-specific notifications or notification_reads
        await storage.deleteAllUserNotifications(userId);
        
        // Finally, delete the user
        const deleted = await storage.deleteUser(userId);
        
        if (!deleted) {
          return res.status(400).json({ message: "Failed to delete user" });
        }
        
        // Log this security-sensitive action
        console.log('Admin deleted user', { 
          deletedUserId: userId,
          deletedUsername: user.username 
        });
        
        return res.status(200).json({ 
          message: "User deleted successfully", 
          success: true,
          userId: userId 
        });
      } catch (deleteError) {
        console.error('Error deleting user data:', deleteError);
        throw new Error(`Failed to delete user data: ${deleteError instanceof Error ? deleteError.message : String(deleteError)}`);
      }
    } catch (error) {
      console.error('Error in user deletion process:', error);
      res.status(500).json({ 
        message: "Failed to delete user", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Get all teams (admin only)
  app.get("/api/teams", async (req, res) => {
    try {
      // Development mode direct access for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: Direct access to teams list');
        
        // Get all teams
        const teams = await storage.getAllTeams();
        
        if (!teams || teams.length === 0) {
          console.log('No teams found in database!');
        } else {
          console.log(`Found ${teams.length} teams in database`);
        }
        
        return res.json(teams);
      }
      
      // Production mode uses enhanced security
      if (!req.session || !req.session.userId || req.session.role !== 'admin') {
        logSecurityEvent('Unauthorized admin access attempt to teams list', req);
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const teams = await storage.getAllTeams();
      
      res.json(teams);
    } catch (error) {
      console.error('Error fetching teams:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get all teams with enhanced info (admin only)
  app.get("/api/admin/teams", async (req, res) => {
    try {
      console.log('Admin requested all teams list');
      
      // Development mode direct access for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: Direct access to enhanced teams list');
        
        // Get all teams
        const teams = await storage.getAllTeams();
        
        if (!teams || teams.length === 0) {
          console.log('No teams found in database!');
          return res.json([]);
        }
        
        console.log(`Found ${teams.length} teams in database`);
        
        // Enhance team info with owner and member counts
        const enhancedTeams = await Promise.all(teams.map(async (team) => {
          // Get owner info
          const owner = await storage.getUser(team.ownerId);
          
          // Get member count
          const members = await storage.getTeamMembers(team.id);
          const memberCount = members.length;
          
          return {
            ...team,
            owner: owner ? { 
              id: owner.id,
              username: owner.username,
              role: owner.role,
              email: owner.email
            } : null,
            memberCount
          };
        }));
        
        return res.json(enhancedTeams);
      }
      
      // Production mode check
      if (!req.session || !req.session.role || req.session.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized: Admin access required" });
      }
      
      // Get all teams
      const teams = await storage.getAllTeams();
      console.log(`Found ${teams.length} teams`);
      
      // Enhance team info with owner and member counts
      const enhancedTeams = await Promise.all(teams.map(async (team) => {
        // Get owner info
        const owner = await storage.getUser(team.ownerId);
        
        // Get member count
        const members = await storage.getTeamMembers(team.id);
        const memberCount = members.length;
        
        return {
          ...team,
          owner: owner ? { 
            id: owner.id,
            username: owner.username,
            role: owner.role,
            email: owner.email
          } : null,
          memberCount
        };
      }));
      
      res.json(enhancedTeams);
    } catch (error) {
      console.error("Error in /api/admin/teams:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get specific team details (admin only)
  app.get("/api/admin/teams/:id", isEnhancedAdmin, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      
      if (isNaN(teamId)) {
        return res.status(400).json({ message: "Invalid team ID" });
      }
      
      const team = await storage.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      res.json(team);
    } catch (error) {
      console.error("Error in GET /api/admin/teams/:id:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get team members for a specific team (admin only)
  app.get("/api/admin/teams/:id/members", isEnhancedAdmin, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      
      if (isNaN(teamId)) {
        return res.status(400).json({ message: "Invalid team ID" });
      }
      
      const team = await storage.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      const members = await storage.getTeamMembers(teamId);
      res.json(members);
    } catch (error) {
      console.error("Error in GET /api/admin/teams/:id/members:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Delete team member (admin only)
  app.delete("/api/admin/teams/:teamId/members/:memberId", async (req, res) => {
    try {
      // Check if user is admin
      if (!req.session || !req.session.role || req.session.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized: Admin access required" });
      }
      
      const teamId = parseInt(req.params.teamId);
      const memberId = parseInt(req.params.memberId);
      
      if (isNaN(teamId) || isNaN(memberId)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      console.log(`Admin attempting to delete team member ${memberId} from team ${teamId}`);
      
      const teamMember = await storage.getTeamMember(memberId);
      
      if (!teamMember) {
        return res.status(404).json({ message: "Team member not found" });
      }
      
      if (teamMember.teamId !== teamId) {
        return res.status(400).json({ message: "Member does not belong to this team" });
      }
      
      const result = await storage.deleteTeamMember(memberId);
      
      if (result) {
        console.log(`Team member ${memberId} deleted successfully`);
        return res.status(200).json({ 
          message: "Team member deleted successfully",
          success: true 
        });
      } else {
        console.error(`Failed to delete team member ${memberId}`);
        return res.status(500).json({ message: "Failed to delete team member" });
      }
    } catch (error) {
      console.error("Error in DELETE /api/admin/teams/:teamId/members/:memberId:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Add team member (admin only)
  app.post("/api/admin/teams/:id/members", isEnhancedAdmin, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      
      if (isNaN(teamId)) {
        return res.status(400).json({ message: "Invalid team ID" });
      }
      
      const team = await storage.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      // Get current team members
      const currentMembers = await storage.getTeamMembers(teamId);
      
      // Check if team is full (4 members for squad, 2 for duo)
      if (team.gameType === 'Squad' && currentMembers.length >= 4) {
        return res.status(400).json({ message: "Squad teams can have maximum 4 members" });
      } else if (team.gameType === 'Duo' && currentMembers.length >= 2) {
        return res.status(400).json({ message: "Duo teams can have maximum 2 members" });
      }
      
      // Check if player name already exists in the team
      if (currentMembers.some(member => member.username === req.body.playerName)) {
        return res.status(400).json({ message: "Player already exists in this team" });
      }
      
      const newMember = await storage.addTeamMember({
        teamId,
        username: req.body.playerName,
        role: req.body.role || "Player",
        gameId: req.body.gameId || ""
      });
      
      res.status(201).json(newMember);
    } catch (error) {
      console.error("Error in POST /api/admin/teams/:id/members:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Delete team through admin panel (admin only)
  app.delete("/api/admin/teams/:id", async (req, res) => {
    try {
      // Check if user is admin
      if (!req.session || !req.session.role || req.session.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized: Admin access required" });
      }
      
      const teamId = parseInt(req.params.id);
      
      if (isNaN(teamId)) {
        return res.status(400).json({ message: "Invalid team ID" });
      }
      
      const team = await storage.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      console.log(`Admin attempting to delete team ${teamId}: ${team.name}`);
      
      // Delete the team and all associated data
      await storage.deleteTeam(teamId);
      
      console.log(`Team ${teamId} deleted successfully`);
      
      res.status(200).json({ 
        message: "Team deleted successfully",
        success: true,
        teamId: teamId
      });
    } catch (error) {
      console.error("Admin delete team error:", error);
      res.status(500).json({ 
        message: "Failed to delete team", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Admin security log
  app.post("/api/admin/log", isEnhancedAdmin, async (req, res) => {
    try {
      const { action } = req.body;
      logSecurityEvent(action, req);
      res.json({ success: true });
    } catch (error) {
      // Don't return error to avoid leaking security information
      res.json({ success: true });
    }
  });

  //
  // Notification Routes
  //
  
  // Get user notifications
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      console.log(`Fetching notifications for user ${userId}`);
      
      // Get both user-specific and broadcast notifications
      const notifications = await storage.getUserNotifications(userId);
      
      // Sort by creation date, most recent first
      notifications.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
      
      console.log(`Found ${notifications.length} notifications for user ${userId}`);
      
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Get unread notification count
  app.get("/api/notifications/count", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      console.log(`Fetching notification count for user ${userId}`);
      const count = await storage.getUnreadNotificationsCount(userId);
      console.log(`User ${userId} has ${count} unread notifications`);
      
      res.json({ count });
    } catch (error) {
      console.error("Error fetching notification count:", error);
      res.status(500).json({ message: "Failed to fetch notification count" });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.session.userId!;
      
      // Verify the notification belongs to this user or is a broadcast
      const notification = await storage.getNotification(notificationId);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      if (notification.userId !== null && notification.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedNotification = await storage.markNotificationAsRead(notificationId, userId);
      res.json(updatedNotification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read
  app.post("/api/notifications/mark-all-read", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });
  
  // Hide notifications for the current user (frontend only, doesn't actually delete)
  app.post("/api/notifications/hide", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // We're not deleting anything on the server, just sending a hide action to this user's WebSockets
      for (const [ws, client] of clients.entries()) {
        if (ws.readyState === WebSocket.OPEN && client.userId === userId) {
          ws.send(JSON.stringify({
            type: 'notification_update',
            count: 0,
            isHideAction: true
          }));
        }
      }
      
      res.json({ 
        success: true, 
        message: "Notifications hidden for current session" 
      });
    } catch (error) {
      console.error("Error hiding notifications:", error);
      res.status(500).json({ message: "Failed to hide notifications" });
    }
  });

  // Admin: Create notification for a user or broadcast to all users
  app.post("/api/admin/notifications", isEnhancedAdmin, async (req, res) => {
    try {
      const result = insertNotificationSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error.format() });
      }
      
      const notification = await storage.createNotification(result.data);
      
      // Log the notification creation
      logSecurityEvent('Admin created notification', req, { 
        notificationId: notification.id,
        notificationType: notification.type,
        targeted: notification.userId !== null
      });
      
      res.status(201).json(notification);
    } catch (error) {
      console.error("Error creating notification:", error);
      res.status(500).json({ message: "Failed to create notification" });
    }
  });
  
  // Create a notification (broadcast to all, send to specific user, or multiple users)
  app.post("/api/notifications", isEnhancedAdmin, async (req, res) => {
    try {
      const { title, message, type = "broadcast", userId = null, userIds = [] } = req.body;
      
      if (!title || !message) {
        return res.status(400).json({ 
          message: "Missing required fields", 
          required: ["title", "message"] 
        });
      }
      
      // Handle multiple user notifications
      if (Array.isArray(userIds) && userIds.length > 0) {
        const notifications = [];
        
        // Create individual notifications for each user
        for (const uid of userIds) {
          const notification = await storage.createNotification({
            title,
            message,
            type: "personal",
            userId: uid,
            relatedId: null
          });
          
          notifications.push(notification);
          
          // Find all connected clients for this user and send their updated count
          for (const [ws, client] of clients.entries()) {
            if (ws.readyState === WebSocket.OPEN && client.userId === uid) {
              const count = await storage.getUnreadNotificationsCount(uid);
              ws.send(JSON.stringify({
                type: 'notification_update',
                count: count
              }));
            }
          }
        }
        
        // Log the notifications creation
        logSecurityEvent('Admin created multiple notifications', req, { 
          notificationCount: notifications.length,
          title,
          userIds
        });
        
        // Return proper JSON response
        return res.status(201).json({ 
          success: true, 
          notificationsCreated: notifications.length,
          notifications
        });
      } else {
        // Create a single notification (userId = null means it's for all users)
        const notification = await storage.createNotification({
          title,
          message,
          type,
          userId,
          relatedId: null
        });
        
        // Log the notification creation
        logSecurityEvent('Admin created notification', req, { 
          notificationId: notification.id,
          title,
          isPersonal: userId !== null
        });
        
        if (userId === null) {
          // For broadcast notifications, we need to notify all users with their specific counts
          // Get all connected clients
          console.log("Broadcasting notification to all connected clients");
          for (const [ws, client] of clients.entries()) {
            if (ws.readyState === WebSocket.OPEN && client.userId) {
              // Get the unread count for this specific user
              const userCount = await storage.getUnreadNotificationsCount(client.userId);
              console.log(`Sending notification count ${userCount} to user ${client.userId}`);
              
              // Send their personal count
              ws.send(JSON.stringify({
                type: 'notification_update',
                count: userCount
              }));
            }
          }
        } else {
          // Find all connected clients for this user and send direct notification update
          for (const [ws, client] of clients.entries()) {
            if (ws.readyState === WebSocket.OPEN && client.userId === userId) {
              const count = await storage.getUnreadNotificationsCount(userId);
              ws.send(JSON.stringify({
                type: 'notification_update',
                count: count
              }));
            }
          }
        }
        
        // Return proper JSON response
        return res.status(201).json({ 
          success: true, 
          notification
        });
      }
    } catch (error) {
      console.error("Error creating notification:", error);
      // Ensure we're returning proper JSON
      return res.status(500).json({ 
        success: false,
        message: "Failed to create notification",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Add notification for tournament room info update
  app.post("/api/tournaments/:id/room-notification", isEnhancedAdmin, async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const tournament = await storage.getTournament(tournamentId);
      
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      
      // Get all registrations for this tournament
      const registrations = await storage.getRegistrationsByTournament(tournamentId);
      
      // Create notifications for each registered user
      const notifications = [];
      
      for (const registration of registrations) {
        const notification = await storage.createNotification({
          userId: registration.userId,
          title: `Room Info Updated - ${tournament.title}`,
          message: `Room ID: ${tournament.roomId}, Password: ${tournament.password}`,
          type: "tournament",
          relatedId: tournamentId
        });
        
        notifications.push(notification);
        
        // Find all connected clients for this user and send direct notification update
        for (const [ws, client] of clients.entries()) {
          if (ws.readyState === WebSocket.OPEN && client.userId === registration.userId) {
            const count = await storage.getUnreadNotificationsCount(registration.userId);
            ws.send(JSON.stringify({
              type: 'notification_update',
              count: count
            }));
          }
        }
      }
      
      res.status(201).json({ 
        success: true, 
        notificationsCreated: notifications.length 
      });
    } catch (error) {
      console.error("Error creating room notifications:", error);
      res.status(500).json({ message: "Failed to create room notifications" });
    }
  });

  const httpServer = createServer(app);
  
  // Set up WebSocket server for real-time notifications
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Track connected clients with their user IDs
  const clients = new Map<WebSocket, { userId?: number }>();
  
  wss.on('connection', (ws) => {
    // Store connected client
    clients.set(ws, {});
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Authentication message to associate websocket with user
        if (data.type === 'auth' && data.userId) {
          const userId = data.userId;
          clients.set(ws, { userId });
          console.log(`WebSocket client authenticated for user ${userId}`);
          
          // Send the current notification count to the user immediately after authentication
          if (ws.readyState === WebSocket.OPEN) {
            try {
              const count = await storage.getUnreadNotificationsCount(userId);
              ws.send(JSON.stringify({
                type: 'notification_update',
                count: count
              }));
              console.log(`Sent initial notification count ${count} to user ${userId}`);
            } catch (err) {
              console.error('Error getting notification count:', err);
            }
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      clients.delete(ws);
    });
  });
  
  // Add a function to broadcast notification updates to connected clients
  const broadcastNotification = (userId: number | null, count: number, isHideAction: boolean = false) => {
    clients.forEach((client, ws) => {
      // For broadcast notifications (userId is null) or targeted notifications
      if (ws.readyState === WebSocket.OPEN && 
          (userId === null || client.userId === userId)) {
        ws.send(JSON.stringify({
          type: 'notification_update',
          count: count,
          isHideAction: isHideAction // This flag tells the client this is a temporary hide, not a real count update
        }));
      }
    });
  };
  
  // Attach the broadcastNotification function to app for use in routes
  app.locals.broadcastNotification = broadcastNotification;
  
  return httpServer;
}
