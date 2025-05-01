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

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
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

      // Create user
      const newUser = await storage.createUser({
        username,
        password: hashedPassword,
        email,
        phone,
        gameId,
        role: role || "user", // Default to "user" if role not provided
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
      if (username === "Sandeepkumarduli" && password === "Sandy@1234") {
        let adminUser = await storage.getUserByUsername(username);
        
        // If admin doesn't exist in storage, create it
        if (!adminUser) {
          const hashedPassword = await hashPassword(password);
          adminUser = await storage.createUser({
            username,
            password: hashedPassword,
            email: "admin@bgmi-tournaments.com",
            phone: "1234567890",
            gameId: "admin",
            role: "admin"
          });
        }
        
        // Ensure the user has admin role regardless of what's in storage
        if (adminUser.role !== "admin") {
          adminUser = await storage.updateUser(adminUser.id, { role: "admin" });
        }
        
        // Store admin info in session
        req.session.userId = adminUser.id;
        req.session.username = adminUser.username;
        req.session.role = "admin";
        
        // Return admin user without password
        const { password: _, ...adminWithoutPassword } = adminUser;
        return res.status(200).json(adminWithoutPassword);
      }
      
      // Regular user login flow
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Ensure non-admin users can't become admin even if they somehow got that role
      if (username !== "Sandeepkumarduli" && user.role === "admin") {
        await storage.updateUser(user.id, { role: "user" });
        user.role = "user";
      }

      const isPasswordValid = await comparePasswords(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid username or password" });
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