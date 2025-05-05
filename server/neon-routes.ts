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
  
  // Get user's teams (both owned and as a member)
  app.get('/api/teams/my', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Get teams owned by user
      const ownedTeams = await storage.getTeamsByOwnerId(userId);
      
      // Get all teams
      const allTeams = await storage.getAllTeams();
      
      // Get all team members to find teams where user is a member
      const memberTeams: any[] = [];
      
      for (const team of allTeams) {
        // Skip teams the user already owns
        if (ownedTeams.some(ownedTeam => ownedTeam.id === team.id)) {
          continue;
        }
        
        // Check if user is a member of this team
        const members = await storage.getTeamMembers(team.id);
        
        // Get the current user to check by username
        const user = await storage.getUser(userId);
        if (!user) {
          continue;
        }
        
        // Check if any member matches the current user's username
        const isMember = members.some(member => member.username === user.username);
        
        if (isMember) {
          memberTeams.push(team);
        }
      }
      
      // Combine owned teams and member teams
      const combinedTeams = [...ownedTeams, ...memberTeams];
      
      res.json(combinedTeams);
    } catch (error) {
      console.error('Error fetching user teams:', error);
      res.status(500).json({ error: 'Failed to fetch team' });
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
      
      // Get the user to automatically add them as team captain
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Generate a unique invite code
      const inviteCode = await generate6DigitCode(storage);
      
      const team = await storage.createTeam({
        ...result.data,
        ownerId: userId,
        description: result.data.description || '',
        inviteCode
      });
      
      // Add the user as team captain automatically
      await storage.addTeamMember({
        teamId: team.id,
        username: user.username,
        gameId: user.gameId,
        role: 'captain'
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
      
      console.log(`Attempting to delete team with ID: ${teamId} by user: ${userId}`);
      
      // Check if the team exists and belongs to the user
      const team = await storage.getTeam(teamId);
      if (!team) {
        console.log(`Team with ID ${teamId} not found`);
        return res.status(404).json({ error: 'Team not found' });
      }
      
      if (team.ownerId !== userId && req.session.role !== 'admin') {
        console.log(`Permission denied: User ${userId} tried to delete team ${teamId} owned by ${team.ownerId}`);
        return res.status(403).json({ error: 'You do not have permission to delete this team' });
      }
      
      // First, delete all team members
      const members = await storage.getTeamMembers(teamId);
      if (members.length > 0) {
        console.log(`Deleting ${members.length} team members`);
        for (const member of members) {
          await storage.deleteTeamMember(member.id);
        }
      }
      
      // Then delete any registrations associated with this team
      const registrations = await storage.getRegistrationsByTeam(teamId);
      if (registrations.length > 0) {
        console.log(`Deleting ${registrations.length} team registrations`);
        for (const registration of registrations) {
          await storage.deleteRegistration(registration.id);
        }
      }
      
      // Finally delete the team
      console.log(`Deleting team ${teamId}`);
      const deleted = await storage.deleteTeam(teamId);
      
      if (!deleted) {
        console.log(`Failed to delete team ${teamId}`);
        return res.status(500).json({ error: 'Failed to delete team' });
      }
      
      console.log(`Team ${teamId} deleted successfully`);
      res.status(200).json({ success: true, message: 'Team deleted successfully' });
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
  
  // Join team by invite code
  app.post('/api/teams/join', isAuthenticated, async (req, res) => {
    try {
      const { inviteCode } = req.body;
      if (!inviteCode) {
        return res.status(400).json({ error: 'Invite code is required' });
      }
      
      // Get the current user
      const userId = req.session.userId as number;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Find team by invite code
      const team = await storage.getTeamByInviteCode(inviteCode);
      
      if (!team) {
        return res.status(404).json({ error: 'Team not found with that invite code' });
      }
      
      // Check if the user already exists in the team
      const members = await storage.getTeamMembers(team.id);
      const existingMember = members.some(m => m.username === user.username);
      
      if (existingMember) {
        return res.status(400).json({ error: 'You are already a member of this team' });
      }
      
      // Add the user to the team
      const teamMember = await storage.addTeamMember({
        teamId: team.id,
        username: user.username,
        gameId: user.gameId,
        role: 'member'
      });
      
      // Create notification for team owner
      await storage.createNotification({
        userId: team.ownerId,
        title: 'New Team Member',
        message: `${user.username} has joined your team ${team.name}`,
        type: 'team',
        relatedId: team.id
      });
      
      // Notify the team owner via WebSocket if they're online
      notifyUser(team.ownerId, {
        type: 'team_update',
        message: `${user.username} has joined your team ${team.name}`
      });
      
      res.status(201).json({ 
        success: true,
        team,
        member: teamMember
      });
    } catch (error) {
      console.error('Error joining team:', error);
      res.status(500).json({ error: 'Failed to join team' });
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

  // Admin Users API Endpoints
  app.get('/api/admin/users', isAdmin, async (req, res) => {
    try {
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
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });
  
  app.get('/api/admin/administrators', isAdmin, async (req, res) => {
    try {
      // Get all admins
      const admins = await storage.getAllAdmins();
      
      // Filter out sensitive information
      const safeAdmins = admins.map(admin => ({
        ...admin,
        password: undefined
      }));
      
      res.json(safeAdmins);
    } catch (error) {
      console.error('Error fetching administrators:', error);
      res.status(500).json({ error: 'Failed to fetch administrators' });
    }
  });
  
  // Admin Teams API Endpoints
  app.get('/api/admin/teams', isAdmin, async (req, res) => {
    try {
      // Get all teams
      const teams = await storage.getAllTeams();
      
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
      console.error('Error fetching admin teams:', error);
      res.status(500).json({ error: 'Failed to fetch teams' });
    }
  });
  
  app.post('/api/admin/teams', isAdmin, async (req, res) => {
    try {
      const { name, ownerId, gameType, description } = req.body;
      
      // Validate required fields
      if (!name || !ownerId) {
        return res.status(400).json({ error: 'Team name and owner ID are required' });
      }
      
      // Check if the owner exists
      const owner = await storage.getUser(ownerId);
      if (!owner) {
        return res.status(404).json({ error: 'Owner not found' });
      }
      
      // Check if team name already exists
      const existingTeam = await storage.getTeamByName(name);
      if (existingTeam) {
        return res.status(400).json({ error: 'Team name already exists' });
      }
      
      // Generate a unique invite code
      const inviteCode = await generate6DigitCode(storage);
      
      // Create the team
      const team = await storage.createTeam({
        name,
        ownerId,
        gameType: gameType || 'BGMI', // Default to BGMI if not specified
        description: description || '',
        inviteCode
      });
      
      // Add the team owner as team captain automatically
      await storage.addTeamMember({
        teamId: team.id,
        username: owner.username,
        gameId: owner.gameId,
        role: 'captain'
      });
      
      res.status(201).json(team);
    } catch (error) {
      console.error('Error creating team through admin:', error);
      res.status(500).json({ error: 'Failed to create team' });
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
      console.log(`Attempting to delete tournament with ID: ${tournamentId}`);
      
      // Check if tournament exists
      const tournament = await storage.getTournament(tournamentId);
      if (!tournament) {
        console.log(`Tournament with ID ${tournamentId} not found`);
        return res.status(404).json({ error: 'Tournament not found' });
      }
      
      // First delete all registrations for this tournament
      const registrations = await storage.getRegistrationsByTournament(tournamentId);
      if (registrations.length > 0) {
        console.log(`Deleting ${registrations.length} registrations for tournament ${tournamentId}`);
        for (const registration of registrations) {
          await storage.deleteRegistration(registration.id);
        }
      }
      
      // Then delete the tournament
      console.log(`Deleting tournament ${tournamentId}`);
      const deletedTournament = await storage.deleteTournament(tournamentId);
      
      if (!deletedTournament) {
        console.log(`Failed to delete tournament ${tournamentId}`);
        return res.status(500).json({ error: 'Failed to delete tournament' });
      }
      
      console.log(`Tournament ${tournamentId} deleted successfully`);
      res.status(200).json({ success: true, message: 'Tournament deleted successfully' });
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

  app.get('/api/registrations/user', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const registrations = await storage.getRegistrationsByUser(userId);
      res.json(registrations);
    } catch (error) {
      console.error('Error fetching user registrations:', error);
      res.status(500).json({ error: 'Failed to fetch registrations' });
    }
  });
  
  app.get('/api/registrations/counts', async (req, res) => {
    try {
      // Get all tournaments
      const tournaments = await storage.getAllTournaments();
      
      // For each tournament, get count of registrations
      const counts: Record<number, number> = {};
      
      for (const tournament of tournaments) {
        const registrations = await storage.getRegistrationsByTournament(tournament.id);
        counts[tournament.id] = registrations.length;
      }
      
      res.json(counts);
    } catch (error) {
      console.error('Error fetching registration counts:', error);
      res.status(500).json({ error: 'Failed to fetch registration counts' });
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
  
  // Additional endpoint for notification count (client compatibility)
  app.get('/api/notifications/count', isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const count = await storage.getUnreadNotificationsCount(userId);
      res.json({ count });
    } catch (error) {
      console.error('Error fetching notification count:', error);
      res.status(500).json({ error: 'Failed to fetch notification count' });
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

  // =========== ADMIN ROUTES ===========
  
  // GET /api/admin/users - Get all users (for admin)
  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      // Get all users
      const users = await storage.getAllUsers();
      
      if (!users || users.length === 0) {
        console.log('No users found in database!');
      } else {
        console.log(`Found ${users.length} users in database`);
      }
      
      // Filter out sensitive information
      const filteredUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        gameId: user.gameId,
        role: user.role,
        createdAt: user.createdAt
      }));
      
      res.json(filteredUsers);
    } catch (error) {
      console.error('Error fetching admin users:', error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // POST /api/admin/users - Create a new user (admin only)
  app.post("/api/admin/users", isAdmin, async (req, res) => {
    try {      
      const { username, email, password, phone, gameId, role = "user" } = req.body;
      
      // Validate required fields
      if (!username || !password || !email || !phone) {
        return res.status(400).json({ message: "Username, password, email and phone are required" });
      }
      
      // Prevent creating an account with hardcoded admin username
      if (username === "Sandeepkumarduli") {
        return res.status(400).json({ message: "This username is reserved" });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }
      
      // Check if email already exists
      const userWithEmail = await storage.getUserByEmail(email);
      if (userWithEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }
      
      // Check if phone already exists
      const userWithPhone = await storage.getUserByPhone(phone);
      if (userWithPhone) {
        return res.status(400).json({ message: "Phone number already in use" });
      }
      
      // Hash password
      const hashedPassword = await hashPassword(password);
      
      // Create user
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        email,
        phone,
        gameId: gameId || '',
        role,
        phoneVerified: true,
        phoneVerificationBypassed: true
      });
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // GET /api/admin/teams - Get all teams (for admin)
  app.get("/api/admin/teams", isAdmin, async (req, res) => {
    try {
      const teams = await storage.getAllTeams();
      res.json(teams);
    } catch (error) {
      console.error('Error fetching teams:', error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  // DELETE /api/admin/users/:id - Delete a user (admin only)
  app.delete("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Prevent deleting system admin
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.username === "Sandeepkumarduli") {
        return res.status(400).json({ message: "Cannot delete system administrator" });
      }
      
      // Delete user
      await storage.deleteUser(userId);
      res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // PATCH /api/admin/users/:id/role - Update a user's role (admin only)
  app.patch("/api/admin/users/:id/role", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { role } = req.body;
      
      if (!role || (role !== "admin" && role !== "user")) {
        return res.status(400).json({ message: "Valid role required (admin or user)" });
      }
      
      // Get user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update role
      const updatedUser = await storage.updateUser(userId, { role });
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // GET /api/admin/administrators - Get all admin users
  app.get("/api/admin/administrators", isAdmin, async (req, res) => {
    try {
      // Get all admins from the admins table
      const admins = await storage.getAllAdmins();
      res.json(admins);
    } catch (error) {
      console.error('Error fetching administrators:', error);
      res.status(500).json({ message: "Failed to fetch administrators" });
    }
  });

  // GET /api/admin/users/:id - Get user details (admin only)
  app.get("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return user without password
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Error fetching user details:', error);
      res.status(500).json({ message: "Failed to fetch user details" });
    }
  });
  
  // GET /api/admin/users/:id/teams - Get teams owned by a user (admin only)
  app.get("/api/admin/users/:id/teams", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const teams = await storage.getTeamsByOwnerId(userId);
      res.json(teams);
    } catch (error) {
      console.error('Error fetching user teams:', error);
      res.status(500).json({ message: "Failed to fetch user teams" });
    }
  });
  
  // GET /api/admin/users/:id/registrations - Get registrations for a user (admin only)
  app.get("/api/admin/users/:id/registrations", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const registrations = await storage.getRegistrationsByUser(userId);
      res.json(registrations);
    } catch (error) {
      console.error('Error fetching user registrations:', error);
      res.status(500).json({ message: "Failed to fetch user registrations" });
    }
  });
  
  // GET /api/admin/teams/:id - Get team details (admin only)
  app.get("/api/admin/teams/:id", isAdmin, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const team = await storage.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      res.json(team);
    } catch (error) {
      console.error('Error fetching team details:', error);
      res.status(500).json({ message: "Failed to fetch team details" });
    }
  });
  
  // GET /api/admin/teams/:id/members - Get team members (admin only)
  app.get("/api/admin/teams/:id/members", isAdmin, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const members = await storage.getTeamMembers(teamId);
      res.json(members);
    } catch (error) {
      console.error('Error fetching team members:', error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });
  
  // Return the HTTP server
  return httpServer;
}