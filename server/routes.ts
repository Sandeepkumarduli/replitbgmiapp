import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import MemoryStore from "memorystore";
import { 
  insertUserSchema, 
  insertTeamSchema, 
  insertTeamMemberSchema, 
  insertTournamentSchema, 
  updateTournamentSchema,
  insertRegistrationSchema 
} from "@shared/schema";
import { z } from "zod";

// Declare session properties
declare module 'express-session' {
  interface SessionData {
    userId: number;
    username: string;
    role: string;
  }
}

const SessionStore = MemoryStore(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "bgmi-tournament-secret",
      resave: true,
      saveUninitialized: false,
      cookie: { 
        secure: process.env.NODE_ENV === "production", 
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        sameSite: "lax"
      },
      store: new SessionStore({ checkPeriod: 86400000 }),
    })
  );

  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.session.userId) {
      next();
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  };

  // Middleware to check if user is admin
  const isAdmin = async (req: Request, res: Response, next: Function) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
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
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Set session
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;
      
      // Save session before sending response
      req.session.save((err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to create session" });
        }
        
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
        role: user.role
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Team routes
  app.post("/api/teams", isAuthenticated, async (req, res) => {
    try {
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
      
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      if (team.ownerId !== userId) {
        return res.status(403).json({ message: "You are not the owner of this team" });
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

  const httpServer = createServer(app);
  return httpServer;
}
