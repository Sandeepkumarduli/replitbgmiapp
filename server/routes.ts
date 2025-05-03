import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
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
import { setupSupabaseAuth } from "./supabase-auth";
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
  app.get("/api/admin/administrators", isEnhancedAdmin, async (req, res) => {
    try {
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
      
      try {
        // Delete the user and all associated data
        await storage.deleteUser(userId);
        
        // Log this security-sensitive action
        logSecurityEvent('Admin deleted user', req, { 
          deletedUserId: userId,
          deletedUsername: user.username 
        });
        
        res.json({ message: "User deleted successfully" });
      } catch (deleteError) {
        console.error('Error in user deletion:', deleteError);
        res.status(500).json({ 
          message: "Failed to delete user", 
          error: "There might be data associated with this user that cannot be deleted. Please contact support." 
        });
      }
    } catch (error) {
      console.error('Error in user deletion process:', error);
      res.status(500).json({ message: "Internal server error", error: error instanceof Error ? error.message : String(error) });
    }
  });
  
  // Get all teams (admin only)
  app.get("/api/teams", isEnhancedAdmin, async (req, res) => {
    try {
      const teams = await storage.getAllTeams();
      res.json(teams);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get all teams with enhanced info (admin only)
  app.get("/api/admin/teams", isEnhancedAdmin, async (req, res) => {
    try {
      logSecurityEvent('Admin requested all teams list', req);
      
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
  app.delete("/api/admin/teams/:teamId/members/:memberId", isEnhancedAdmin, async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const memberId = parseInt(req.params.memberId);
      
      if (isNaN(teamId) || isNaN(memberId)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const teamMember = await storage.getTeamMember(memberId);
      
      if (!teamMember) {
        return res.status(404).json({ message: "Team member not found" });
      }
      
      if (teamMember.teamId !== teamId) {
        return res.status(400).json({ message: "Member does not belong to this team" });
      }
      
      const result = await storage.deleteTeamMember(memberId);
      
      if (result) {
        res.status(200).json({ message: "Team member deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete team member" });
      }
    } catch (error) {
      console.error("Error in DELETE /api/admin/teams/:teamId/members/:memberId:", error);
      res.status(500).json({ message: "Internal server error" });
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
  
  // Delete team through admin panel (admin only, with enhanced security)
  app.delete("/api/admin/teams/:id", isEnhancedAdmin, async (req, res) => {
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
      
      // Delete the team and all associated data
      try {
        await storage.deleteTeam(teamId);
        res.json({ message: "Team deleted successfully" });
      } catch (deleteError) {
        console.error("Error deleting team:", deleteError);
        return res.status(500).json({ 
          message: "Failed to delete team", 
          error: "There might be data associated with this team that cannot be deleted. Please contact support."
        });
      }
    } catch (error) {
      console.error("Admin delete team error:", error);
      res.status(500).json({ 
        message: "Internal server error", 
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
      const notifications = await storage.getUserNotifications(userId);
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
      const count = await storage.getUnreadNotificationsCount(userId);
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
      
      const updatedNotification = await storage.markNotificationAsRead(notificationId);
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
      
      // We're not deleting anything on the server, just updating the count to 0 for this user's WebSocket
      if (app.locals.broadcastNotification) {
        app.locals.broadcastNotification(userId, 0, true); // The third parameter indicates this is a temporary hide
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
          
          // Get the updated count for this user and broadcast it
          const count = await storage.getUnreadNotificationsCount(uid);
          app.locals.broadcastNotification(uid, count);
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
          // Broadcast notification to all connected clients
          app.locals.broadcastNotification(null, 1); // Send update to all users
        } else {
          // Get the updated count for this user and broadcast it
          const count = await storage.getUnreadNotificationsCount(userId);
          app.locals.broadcastNotification(userId, count);
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
        
        // Send real-time notification update to this user
        const count = await storage.getUnreadNotificationsCount(registration.userId);
        app.locals.broadcastNotification(registration.userId, count);
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
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Authentication message to associate websocket with user
        if (data.type === 'auth' && data.userId) {
          clients.set(ws, { userId: data.userId });
          console.log(`WebSocket client authenticated for user ${data.userId}`);
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
