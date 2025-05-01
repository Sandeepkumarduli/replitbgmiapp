import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema,
  insertTeamSchema, 
  insertTeamMemberSchema, 
  insertTournamentSchema, 
  updateTournamentSchema,
  insertRegistrationSchema 
} from "@shared/schema";
import { setupAuth } from "./auth";
import { setupSupabaseAuth } from "./supabase-auth";
import { 
  setupSecurityMiddleware, 
  trackFailedLogin, 
  resetLoginAttempts, 
  enhancedAdminCheck,
  validateHardcodedAdmin,
  logSecurityEvent
} from "./auth-security";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Choose which authentication system to use
  const useSupabase = process.env.USE_SUPABASE === 'true';
  
  // Setup authentication with middleware
  const { isAuthenticated, isAdmin } = useSupabase 
    ? setupSupabaseAuth(app) 
    : setupAuth(app);
    
  // Setup enhanced security middleware
  setupSecurityMiddleware(app);
  
  // Enhanced Admin Check middleware for high-security routes
  const isEnhancedAdmin = async (req: Request, res: Response, next: NextFunction) => {
    // First check if user is an admin
    if (!req.session || !req.session.userId || req.session.role !== 'admin') {
      logSecurityEvent('Unauthorized admin access attempt', req);
      return res.status(403).json({ message: "Unauthorized access attempt logged" });
    }
    
    // Apply enhanced security checks for admin
    await enhancedAdminCheck(req, res, next);
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
      
      // Check if user exists and password matches
      if (!user || user.password !== password) {
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
      
      const team = await storage.createTeam(result.data);
      
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
      const teams = await storage.getTeamsByOwnerId(userId);
      res.json(teams);
    } catch (error) {
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
      
      res.json(updatedTournament);
    } catch (error) {
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
      
      await storage.deleteTournament(tournamentId);
      
      res.json({ message: "Tournament deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
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
      const tournamentType = tournament.gameType || 'Squad'; // Default to Squad if not specified
      
      // Check if team registration is needed (Solo tournaments don't need teams)
      if (tournamentType.toLowerCase() === 'solo') {
        // For Solo tournaments, the user registers directly without a team
        // The teamId will be the same as userId (user represents themselves)
        // Check if user is already registered
        const userRegistrations = await storage.getRegistrationsByUser(userId);
        const alreadyRegistered = userRegistrations.some(reg => reg.tournamentId === tournamentId);
        
        if (alreadyRegistered) {
          return res.status(400).json({ message: "You are already registered for this tournament" });
        }
        
        // Check if tournament is already full
        const registrations = await storage.getRegistrationsByTournament(tournamentId);
        if (registrations.length >= tournament.slots) {
          return res.status(400).json({ message: "Tournament is already full" });
        }
        
        // Create a direct registration for the user
        const soloResult = insertRegistrationSchema.safeParse({
          tournamentId,
          teamId: userId, // User is registered as an individual
          userId
        });
        
        if (!soloResult.success) {
          return res.status(400).json({ message: soloResult.error.format() });
        }
        
        const registration = await storage.createRegistration(soloResult.data);
        return res.status(201).json(registration);
      }
      
      // For Duo and Squad tournaments, proceed with team validation
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      if (team.ownerId !== userId) {
        return res.status(403).json({ message: "You are not the owner of this team" });
      }
      
      // Get team members to check team size
      const teamMembers = await storage.getTeamMembers(teamId);
      
      // Validate team size based on tournament type
      if (tournamentType.toLowerCase() === 'squad' && teamMembers.length < 4) {
        return res.status(400).json({ 
          message: "Squad tournaments require at least 4 team members", 
          currentSize: teamMembers.length,
          requiredSize: 4
        });
      } else if (tournamentType.toLowerCase() === 'duo' && teamMembers.length < 2) {
        return res.status(400).json({ 
          message: "Duo tournaments require at least 2 team members", 
          currentSize: teamMembers.length,
          requiredSize: 2
        });
      }
      
      // Check if tournament is already full
      const registrations = await storage.getRegistrationsByTournament(tournamentId);
      if (registrations.length >= tournament.slots) {
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
      res.status(500).json({ message: "Internal server error" });
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
      const registrations = await storage.getRegistrationsByUser(userId);
      
      // Get additional information for each registration
      const result = await Promise.all(
        registrations.map(async (registration) => {
          const tournament = await storage.getTournament(registration.tournamentId);
          const team = await storage.getTeam(registration.teamId);
          
          return {
            ...registration,
            tournament,
            team
          };
        })
      );
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
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
      
      await storage.deleteRegistration(registrationId);
      
      res.json({ message: "Registration canceled successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin API routes - highly secured
  
  // Get all users (admin only, with enhanced security)
  app.get("/api/admin/users", isEnhancedAdmin, async (req, res) => {
    try {
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
      res.status(500).json({ message: "Internal server error" });
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
  
  // Get user by ID (admin only)
  app.get("/api/admin/users/:id", isAdmin, async (req, res) => {
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
  
  // Delete user (admin only, with enhanced security)
  app.delete("/api/admin/users/:id", isEnhancedAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Get the current admin's userId from the session
      const adminUserId = req.session.userId!;
      
      // Don't allow deleting own account
      if (userId === adminUserId) {
        logSecurityEvent('Admin attempted to delete own account', req);
        return res.status(400).json({ message: "You cannot delete your own account" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't allow deleting the hardcoded admin
      if (user.username === "Sandeepkumarduli") {
        logSecurityEvent('Admin attempted to delete system admin account', req, { targetUser: user.username });
        return res.status(403).json({ message: "Cannot delete system administrator account" });
      }
      
      // Delete the user
      const isDeleted = await storage.deleteUser(userId);
      
      if (!isDeleted) {
        return res.status(500).json({ message: "Failed to delete user" });
      }
      
      // Log this security-sensitive action
      logSecurityEvent('Admin deleted user', req, { 
        deletedUserId: userId,
        deletedUsername: user.username 
      });
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get all teams (admin only)
  app.get("/api/teams", isAdmin, async (req, res) => {
    try {
      const teams = await storage.getAllTeams();
      res.json(teams);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Delete team (admin only, with enhanced security)
  app.delete("/api/teams/:id", isEnhancedAdmin, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const team = await storage.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      // Log this security-sensitive action
      logSecurityEvent('Admin deleted team', req, { 
        teamId,
        teamName: team.name,
        teamOwnerId: team.ownerId
      });
      
      // Delete the team
      const isDeleted = await storage.deleteTeam(teamId);
      
      if (!isDeleted) {
        return res.status(500).json({ message: "Failed to delete team" });
      }
      
      res.json({ message: "Team deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Admin security log
  app.post("/api/admin/log", isAdmin, async (req, res) => {
    try {
      const { action } = req.body;
      logSecurityEvent(action, req);
      res.json({ success: true });
    } catch (error) {
      // Don't return error to avoid leaking security information
      res.json({ success: true });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
