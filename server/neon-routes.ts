import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from 'express-session';
import { storage } from "./storage";
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
import { testDatabaseConnection } from "./neon-db";
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
  console.log("Using Neon DB for storage");
  
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
  
  // Add diagnostic routes for debugging
  app.get('/api/diagnostic/database', async (req, res) => {
    try {
      // @ts-ignore - checkDatabaseStatus may not be in IStorage interface
      const dbStatus = await storage.checkDatabaseStatus();
      
      // Test direct database connection
      const isConnected = await testDatabaseConnection();
      
      res.json({
        status: dbStatus?.status || 'unknown',
        userCount: dbStatus?.userCount || 0,
        tables: dbStatus?.tables || [],
        directConnectionStatus: isConnected ? 'connected' : 'error',
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

  // Get current authenticated user
  app.get('/api/auth/me', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      if (req.session.isFromAdminTable && req.session.role === 'admin') {
        // Get admin from admins table
        const admin = await storage.getAdmin(req.session.userId);
        
        if (!admin) {
          return res.status(404).json({ message: "Admin not found" });
        }
        
        // Remove password from response and add role field
        const { password: _, ...adminData } = admin;
        return res.json({
          ...adminData,
          role: "admin" // Ensure role is set to admin
        });
      } else {
        // Regular user
        const user = await storage.getUser(req.session.userId);
        
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        
        // Return user without password
        const { password: _, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      return res.status(500).json({ 
        error: 'Failed to get user data',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // API Routes for User Management
  app.post('/api/register', async (req, res) => {
    try {
      console.log("Registration request received:", req.body);

      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: 'Invalid user data',
          details: result.error.errors
        });
      }

      const { username, email, password, phone, gameId } = result.data;
      
      // Check if the user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      if (email) {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ error: 'Email already in use' });
        }
      }

      // Create the user
      const hashedPassword = await hashPassword(password);
      
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        email,
        phone,
        gameId,
        role: 'user',
        phoneVerified: true,
        phoneVerificationBypassed: true
      });

      // Set the session for the new user
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;

      return res.status(201).json(user);
    } catch (error) {
      console.error('Error in registration:', error);
      res.status(500).json({
        error: 'Registration failed',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Login route
  app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        trackFailedLogin(req);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const { comparePasswords } = await import('./auth');
      const isPasswordValid = await comparePasswords(password, user.password);
      
      if (!isPasswordValid) {
        trackFailedLogin(req);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Reset login attempts after successful login
      resetLoginAttempts(req);

      // Set session
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;

      // Log successful login
      logSecurityEvent('login_success', req, { userId: user.id, username: user.username });

      return res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        gameId: user.gameId
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Login failed',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Logout route
  app.post('/api/logout', (req, res) => {
    if (req.session) {
      const username = req.session.username;
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ error: 'Logout failed' });
        }
        logSecurityEvent('logout', req, { username });
        res.status(200).json({ message: 'Logged out successfully' });
      });
    } else {
      res.status(200).json({ message: 'No active session' });
    }
  });

  // Current user route
  app.get('/api/user', isAuthenticated, (req, res) => {
    res.json({
      id: req.session.userId,
      username: req.session.username,
      role: req.session.role
    });
  });

  // Get user profile route
  app.get('/api/profile', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Return sanitized user without password
      const { password, ...userProfile } = user;
      res.json(userProfile);
    } catch (error) {
      console.error('Error fetching profile:', error);
      res.status(500).json({
        error: 'Failed to fetch profile',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Team routes
  app.get('/api/teams', isAuthenticated, async (req, res) => {
    try {
      const teams = await storage.getAllTeams();
      res.json(teams);
    } catch (error) {
      console.error('Error fetching teams:', error);
      res.status(500).json({ error: 'Failed to fetch teams' });
    }
  });

  app.get('/api/teams/owned', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const teams = await storage.getTeamsByOwnerId(userId);
      res.json(teams);
    } catch (error) {
      console.error('Error fetching owned teams:', error);
      res.status(500).json({ error: 'Failed to fetch owned teams' });
    }
  });

  app.get('/api/teams/:id', isAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const team = await storage.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }
      
      res.json(team);
    } catch (error) {
      console.error('Error fetching team:', error);
      res.status(500).json({ error: 'Failed to fetch team' });
    }
  });

  app.post('/api/teams', isAuthenticated, async (req, res) => {
    try {
      const result = insertTeamSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: 'Invalid team data',
          details: result.error.errors
        });
      }
      
      const userId = req.session.userId as number;
      
      // Generate a unique invite code
      const inviteCode = await generate6DigitCode(storage);
      
      const team = await storage.createTeam({
        ...result.data,
        ownerId: userId,
        inviteCode
      });
      
      res.status(201).json(team);
    } catch (error) {
      console.error('Error creating team:', error);
      res.status(500).json({ error: 'Failed to create team' });
    }
  });

  app.put('/api/teams/:id', isAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const userId = req.session.userId as number;
      
      // Check if the team exists and belongs to the user
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }
      
      if (team.ownerId !== userId && req.session.role !== 'admin') {
        return res.status(403).json({ error: 'You do not have permission to update this team' });
      }
      
      // Update the team
      const updatedTeam = await storage.updateTeam(teamId, req.body);
      res.json(updatedTeam);
    } catch (error) {
      console.error('Error updating team:', error);
      res.status(500).json({ error: 'Failed to update team' });
    }
  });

  app.delete('/api/teams/:id', isAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const userId = req.session.userId as number;
      
      // Check if the team exists and belongs to the user
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }
      
      if (team.ownerId !== userId && req.session.role !== 'admin') {
        return res.status(403).json({ error: 'You do not have permission to delete this team' });
      }
      
      // Delete the team
      await storage.deleteTeam(teamId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting team:', error);
      res.status(500).json({ error: 'Failed to delete team' });
    }
  });

  // Team member routes
  app.get('/api/teams/:teamId/members', isAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const members = await storage.getTeamMembers(teamId);
      res.json(members);
    } catch (error) {
      console.error('Error fetching team members:', error);
      res.status(500).json({ error: 'Failed to fetch team members' });
    }
  });

  app.post('/api/teams/:teamId/members', isAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const result = insertTeamMemberSchema.safeParse({
        ...req.body,
        teamId
      });
      
      if (!result.success) {
        return res.status(400).json({ 
          error: 'Invalid team member data',
          details: result.error.errors
        });
      }
      
      // Check if the user already exists in the team
      const members = await storage.getTeamMembers(teamId);
      const existingMember = members.find(m => m.username === result.data.username);
      
      if (existingMember) {
        return res.status(400).json({ error: 'User is already a member of this team' });
      }
      
      const member = await storage.addTeamMember({
        ...result.data
      });
      
      res.status(201).json(member);
    } catch (error) {
      console.error('Error adding team member:', error);
      res.status(500).json({ error: 'Failed to add team member' });
    }
  });
  
  // Tournament routes
  app.get('/api/tournaments', async (req, res) => {
    try {
      const tournaments = await storage.getAllTournaments();
      res.json(tournaments);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      res.status(500).json({ error: 'Failed to fetch tournaments' });
    }
  });

  app.get('/api/tournaments/:id', async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const tournament = await storage.getTournament(tournamentId);
      
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      
      res.json(tournament);
    } catch (error) {
      console.error('Error fetching tournament:', error);
      res.status(500).json({ error: 'Failed to fetch tournament' });
    }
  });

  app.post('/api/tournaments', isAdmin, async (req, res) => {
    try {
      const result = insertTournamentSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: 'Invalid tournament data',
          details: result.error.errors
        });
      }
      
      const userId = req.session.userId as number;
      
      const tournament = await storage.createTournament({
        ...result.data,
        createdBy: userId
      });
      
      res.status(201).json(tournament);
    } catch (error) {
      console.error('Error creating tournament:', error);
      res.status(500).json({ error: 'Failed to create tournament' });
    }
  });

  app.put('/api/tournaments/:id', isAdmin, async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      
      // Validate with updateTournamentSchema
      const result = updateTournamentSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: 'Invalid tournament data',
          details: result.error.errors
        });
      }
      
      // Update the tournament
      const updatedTournament = await storage.updateTournament(tournamentId, result.data);
      
      if (!updatedTournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      
      res.json(updatedTournament);
    } catch (error) {
      console.error('Error updating tournament:', error);
      res.status(500).json({ error: 'Failed to update tournament' });
    }
  });

  app.delete('/api/tournaments/:id', isAdmin, async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      
      // Delete the tournament
      const success = await storage.deleteTournament(tournamentId);
      
      if (!success) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting tournament:', error);
      res.status(500).json({ error: 'Failed to delete tournament' });
    }
  });

  // Registration routes
  app.get('/api/tournaments/:tournamentId/registrations', async (req, res) => {
    try {
      const tournamentId = parseInt(req.params.tournamentId);
      const registrations = await storage.getRegistrationsByTournament(tournamentId);
      res.json(registrations);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      res.status(500).json({ error: 'Failed to fetch registrations' });
    }
  });

  app.post('/api/registrations', isAuthenticated, async (req, res) => {
    try {
      const result = insertRegistrationSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: 'Invalid registration data',
          details: result.error.errors 
        });
      }
      
      const userId = req.session.userId as number;
      
      // Check if already registered
      if (result.data.teamId) {
        const isRegistered = await storage.checkRegistration(result.data.tournamentId, result.data.teamId);
        if (isRegistered) {
          return res.status(400).json({ error: 'Team is already registered for this tournament' });
        }
      }
      
      const registration = await storage.createRegistration({
        ...result.data,
        userId,
        status: 'pending',
        paymentStatus: 'pending'
      });
      
      res.status(201).json(registration);
    } catch (error) {
      console.error('Error creating registration:', error);
      res.status(500).json({ error: 'Failed to create registration' });
    }
  });

  // Notification routes
  app.get('/api/notifications', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  app.get('/api/notifications/unread', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const count = await storage.getUnreadNotificationsCount(userId);
      res.json({ count });
    } catch (error) {
      console.error('Error fetching unread notifications count:', error);
      res.status(500).json({ error: 'Failed to fetch unread notifications count' });
    }
  });

  app.post('/api/notifications/read/:id', isAuthenticated, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.session.userId as number;
      
      const updated = await storage.markNotificationAsRead(notificationId, userId);
      
      if (!updated) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      
      res.json(updated);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  });

  app.post('/api/notifications/read-all', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      await storage.markAllNotificationsAsRead(userId);
      res.status(200).json({ message: 'All notifications marked as read' });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
  });

  // Admin-only route to create a notification
  app.post('/api/notifications', isAdmin, async (req, res) => {
    try {
      const result = insertNotificationSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: 'Invalid notification data',
          details: result.error.errors
        });
      }
      
      const notification = await storage.createNotification({
        ...result.data,
        type: result.data.type || "general"
      });
      
      res.status(201).json(notification);
    } catch (error) {
      console.error('Error creating notification:', error);
      res.status(500).json({ error: 'Failed to create notification' });
    }
  });

  // WebSocket server for real-time updates
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Track clients with their user ID
  const clients = new Map<WebSocket, { userId?: number }>();
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    clients.set(ws, {});
    
    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message);
        
        if (data.type === 'auth' && data.userId) {
          // Authenticate the WebSocket connection
          clients.set(ws, { userId: data.userId });
          console.log(`WebSocket authenticated for user ${data.userId}`);
          
          // Send unread notification count upon authentication
          const count = await storage.getUnreadNotificationsCount(data.userId);
          ws.send(JSON.stringify({ 
            type: 'unread_count', 
            count 
          }));
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      clients.delete(ws);
    });
  });
  
  // Export a function to send notifications via WebSocket
  const notifyUser = (userId: number, data: any) => {
    for (const [client, info] of clients) {
      if (info.userId === userId && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    }
  };
  
  // Export a function to broadcast to all connected clients
  const broadcast = (data: any) => {
    for (const [client, _] of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    }
  };
  
  // Make notification functions available globally
  (global as any).wss = { notifyUser, broadcast };
  
  // Return the HTTP server
  return httpServer;
}