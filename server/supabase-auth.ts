import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";
import { supabase } from "./supabase";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

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

export function setupSupabaseAuth(app: Express) {
  // Initialize session
  const sessionSecret = process.env.SESSION_SECRET || "supabase_auth_secret";
  
  app.use(
    session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    next();
  };

  // Middleware to check if user is an admin
  const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);

    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    next();
  };

  // Set up routes for authentication with Supabase
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password, phone, gameId, role = "user" } = req.body;

      // Validate role - only allow "user" role from API requests
      // This prevents users from creating admin accounts via API
      if (role !== "user") {
        return res.status(400).json({ message: "Invalid role specified" });
      }

      // Check if username already exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("username", username)
        .single();

      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Check if email already exists
      const { data: existingEmail } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();

      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Hash the password
      const hashedPassword = await hashPassword(password);

      // Create user in Supabase
      const { data: newUser, error } = await supabase
        .from("users")
        .insert({
          username,
          email,
          password: hashedPassword,
          phone,
          gameId,
          role
        })
        .select()
        .single();

      if (error || !newUser) {
        console.error("Error creating user:", error);
        return res.status(500).json({ message: "Failed to create user" });
      }

      // Set session
      req.session.userId = newUser.id;
      req.session.username = newUser.username;
      req.session.role = newUser.role;

      // Save session before responding
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }

        // Return user data without password
        res.status(201).json({
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      // Get user from Supabase
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .single();

      if (error || !user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Compare passwords
      const isValidPassword = await comparePasswords(password, user.password);

      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Set session
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;

      // Save session before responding
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }

        // Return user data without password
        res.json({
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
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
      // Get user from Supabase
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", req.session.userId)
        .single();

      if (error || !user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return user data without password
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        gameId: user.gameId,
        role: user.role
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return { isAuthenticated, isAdmin };
}