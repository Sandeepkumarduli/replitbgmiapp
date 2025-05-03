import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, InsertUser } from "@shared/schema";
import createMemoryStore from "memorystore";

declare module "express-session" {
  interface SessionData {
    userId: number;
    username: string;
    role: string;
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Create memory store for sessions
  const MemStore = createMemoryStore(session);
  const sessionStore = new MemStore({
    checkPeriod: 86400000, // prune expired entries every 24h
  });

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "BGMI_tournament_app_secret",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    },
  };

  app.use(session(sessionSettings));

  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.session.userId) {
      return next();
    }
    return res.status(401).json({ message: "Not authenticated" });
  };

  // Middleware to check if user is admin
  const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    return next();
  };

  // Registration endpoint
  app.post("/api/register", async (req, res) => {
    try {
      const { username, password, email, phone, gameId, role } = req.body;

      // Validate required fields
      if (!username || !password || !email || !phone || !gameId) {
        return res.status(400).json({ message: "All fields are required" });
      }
      
      // Prevent anyone from registering as Sandeepkumarduli (admin username)
      if (username === "Sandeepkumarduli") {
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
      
      // Check if BGMI ID already exists
      const allUsers = await storage.getAllUsers();
      const existingGameId = allUsers.find(user => user.gameId === gameId);
      if (existingGameId) {
        return res.status(400).json({ message: "BGMI ID already exists" });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user - always force role to be "user" regardless of what's submitted
      const newUser = await storage.createUser({
        username,
        password: hashedPassword,
        email,
        phone,
        gameId,
        role: "user", // Enforce user role, ignore any attempted role override
      });

      // Store user info in session
      req.session.userId = newUser.id;
      req.session.username = newUser.username;
      req.session.role = newUser.role;

      // Return user without password
      const { password: _, ...userWithoutPassword } = newUser;
      return res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({ message: "Server error during registration" });
    }
  });

  // Login endpoint
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      // Handle admin login with hardcoded credentials
      const adminUsername = "Sandeepkumarduli";
      const adminEmail = "admin@bgmi-tournaments.com";
      const adminPassword = "Sandy@1234";
      
      if ((username === adminUsername || username === adminEmail) && password === adminPassword) {
        try {
          // Try to get admin by username first
          let adminUser = await storage.getUserByUsername(adminUsername);
          
          // If not found, check by email
          if (!adminUser && username === adminEmail) {
            adminUser = await storage.getUserByEmail(adminEmail);
          }
          
          // If admin doesn't exist in storage, create it
          if (!adminUser) {
            const hashedPassword = await hashPassword(password);
            adminUser = await storage.createUser({
              username: adminUsername,
              password: hashedPassword,
              email: adminEmail,
              phone: "1234567890",
              gameId: "admin",
              role: "admin"
            });
          } else {
            // Ensure the user has admin role regardless of what's in storage
            if (adminUser.role !== "admin") {
              const updatedAdmin = await storage.updateUser(adminUser.id, { role: "admin" });
              if (updatedAdmin) {
                adminUser = updatedAdmin;
              }
            }
          }
          
          // At this point we should have a valid admin user
          if (adminUser) {
            // Store admin info in session
            req.session.userId = adminUser.id;
            req.session.username = adminUser.username;
            req.session.role = "admin";
            
            // Return admin user without password
            const { password: _, ...adminWithoutPassword } = adminUser;
            return res.status(200).json(adminWithoutPassword);
          }
          
          // If we reach here, something went wrong with admin creation/update
          return res.status(500).json({ message: "Failed to authenticate admin" });
        } catch (error) {
          console.error("Admin login error:", error);
          return res.status(500).json({ message: "Server error during admin login" });
        }
      }
      
      // Regular user login flow - check both username and email
      // First try by username
      let user = await storage.getUserByUsername(username);
      
      // If not found by username, try by email
      if (!user) {
        // Check if the input looks like an email
        if (username.includes('@')) {
          user = await storage.getUserByEmail(username);
        }
        
        // If still not found, return error
        if (!user) {
          return res.status(401).json({ message: "Please check username or password" });
        }
      }
      
      // Ensure non-admin users can't become admin even if they somehow got that role
      if (user.username !== "Sandeepkumarduli" && user.role === "admin") {
        await storage.updateUser(user.id, { role: "user" });
        user.role = "user";
      }

      const isPasswordValid = await comparePasswords(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Please check username or password" });
      }

      // Store user info in session
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Server error during login" });
    }
  });

  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      return res.status(200).json({ message: "Logged out successfully" });
    });
  });

  // Get current user endpoint
  app.get("/api/user", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(404).json({ message: "User not found" });
      }

      // Return user without password
      const { password, ...userWithoutPassword } = user;
      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error("Get user error:", error);
      return res.status(500).json({ message: "Server error getting user" });
    }
  });

  // Update user profile endpoint
  app.patch("/api/user", isAuthenticated, async (req, res) => {
    try {
      const { email, phone, gameId, password, currentPassword } = req.body;
      const userId = req.session.userId!;

      // Get current user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // If updating password, verify current password
      if (password) {
        if (!currentPassword) {
          return res.status(400).json({ message: "Current password is required to update password" });
        }

        const isPasswordValid = await comparePasswords(currentPassword, user.password);
        if (!isPasswordValid) {
          return res.status(400).json({ message: "Current password is incorrect" });
        }
      }

      // Prepare update data
      const updateData: Partial<User> = {};
      
      if (email) updateData.email = email;
      if (phone) updateData.phone = phone;
      if (gameId) updateData.gameId = gameId;
      if (password) updateData.password = await hashPassword(password);

      // Update user
      const updatedUser = await storage.updateUser(userId, updateData);
      if (!updatedUser) {
        return res.status(404).json({ message: "Failed to update user" });
      }

      // Return updated user without password
      const { password: _, ...userWithoutPassword } = updatedUser;
      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error("Update user error:", error);
      return res.status(500).json({ message: "Server error updating user" });
    }
  });

  // Return middleware functions for use in other routes
  return { isAuthenticated, isAdmin };
}