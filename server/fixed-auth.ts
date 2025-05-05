/**
 * Enhanced authentication module specifically for Supabase integration
 * Replaces conflicting auth endpoints with a single implementation
 */

import { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { hashPassword, comparePasswords } from "./auth";
import { User, InsertUser, insertUserSchema } from "@shared/schema";
import { logSecurityEvent } from "./auth-security";

// Basic security tracking
const loginAttempts = new Map<string, number>();

// Track failed login for an IP
function trackFailedLogin(req: Request): void {
  const ip = req.ip || 'unknown';
  const currentAttempts = loginAttempts.get(ip) || 0;
  loginAttempts.set(ip, currentAttempts + 1);
}

// Reset login attempts after successful login
function resetLoginAttempts(req: Request): void {
  const ip = req.ip || 'unknown';
  loginAttempts.delete(ip);
}

export function setupFixedAuth(app: Express) {
  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    next();
  };

  // Middleware to check if user is admin
  const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    next();
  };

  // Fix registration endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      console.log("Registration request received:", {
        username: req.body.username,
        email: req.body.email
      });

      // Parse and validate the request body
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: result.error.format() 
        });
      }

      const { username, password, email, phone, gameId, role = "user" } = result.data;

      // Prevent registration with reserved admin username
      if (username === "Sandeepkumarduli") {
        return res.status(400).json({ message: "This username is reserved" });
      }

      // Check for existing username
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Check for existing email
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Check for existing phone
      const existingPhone = await storage.getUserByPhone(phone);
      if (existingPhone) {
        return res.status(400).json({ message: "Phone number already exists" });
      }

      // Hash the password
      const hashedPassword = await hashPassword(password);

      // Create user with validated data
      try {
        const newUser = await storage.createUser({
          username,
          password: hashedPassword,
          email,
          phone,
          gameId,
          role: "user", // Always force regular user role for security
          phoneVerified: false,
          phoneVerificationBypassed: true, // Skip verification as requested
          firebaseUid: null
        } as InsertUser);

        // Set session data
        if (req.session) {
          req.session.userId = newUser.id;
          req.session.username = newUser.username;
          req.session.role = newUser.role;

          // Save session before responding
          req.session.save((err) => {
            if (err) {
              console.error("Session save error:", err);
              return res.status(500).json({ message: "Failed to create session" });
            }

            // Return user data without sensitive fields
            const { password: _, ...safeUser } = newUser;
            return res.status(201).json(safeUser);
          });
        } else {
          console.error("Session object not available");
          const { password: _, ...safeUser } = newUser;
          return res.status(201).json(safeUser);
        }
      } catch (storageError) {
        console.error("Error creating user in storage:", storageError);
        return res.status(500).json({ 
          message: "Failed to create user", 
          details: storageError instanceof Error ? storageError.message : String(storageError)
        });
      }
    } catch (error) {
      console.error("Error creating user:", {
        message: error instanceof Error ? error.message : String(error),
        details: error instanceof Error ? error.stack : "No stack trace",
      });
      return res.status(500).json({ 
        message: "Failed to create user",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Hardcoded admin login check
  const checkHardcodedAdmin = (username: string, password: string): boolean => {
    return username === "Sandeepkumarduli" && password === "Sandy@1234";
  };

  // Fix login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password, role } = req.body;
      
      // Log login attempt for security monitoring
      logSecurityEvent("login_attempt", req, { username, hasRole: !!role });

      // Special case for hardcoded admin
      if (checkHardcodedAdmin(username, password)) {
        console.log("Hardcoded admin login detected");
        
        // Check if admin exists in database
        let adminUser = await storage.getUserByUsername(username);
        
        if (!adminUser) {
          // Create admin user if not found
          console.log("Admin user not found, creating admin account");
          
          const hashedPassword = await hashPassword(password);
          try {
            adminUser = await storage.createUser({
              username,
              password: hashedPassword,
              email: "admin@bgmi-tournaments.com",
              phone: "1234567890",
              gameId: "admin",
              role: "admin",
              phoneVerified: true,
              phoneVerificationBypassed: true,
              firebaseUid: null
            } as InsertUser);
            
            console.log("Admin user created successfully");
          } catch (createError) {
            console.error("Failed to create admin user:", createError);
          }
        }
        
        if (adminUser) {
          // Set admin session
          if (req.session) {
            req.session.userId = adminUser.id;
            req.session.username = adminUser.username;
            req.session.role = "admin"; // Force admin role
            
            // Reset login attempts for admin
            resetLoginAttempts(req);
            
            // Remove password from response
            const { password: _, ...adminData } = adminUser;
            return res.status(200).json(adminData);
          } else {
            console.error("Session object not available for admin login");
            return res.status(500).json({ message: "Session not available" });
          }
        } else {
          // This should not happen, but just in case
          console.error("Admin user creation failed - could not retrieve user");
          return res.status(500).json({ message: "Failed to create admin account" });
        }
      }
      
      // Regular user login
      const user = await storage.getUserByUsername(username);
      if (!user) {
        // Track failed login attempt
        trackFailedLogin(req);
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Check password
      const isPasswordValid = await comparePasswords(password, user.password);
      if (!isPasswordValid) {
        // Track failed login attempt
        trackFailedLogin(req);
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
          // Set session data
      if (req.session) {
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;
        
        // Remove password from response
        const { password: _, ...userData } = user;
        return res.status(200).json(userData);
      } else {
        console.error("Session object not available for user login");
        return res.status(500).json({ message: "Session not available" });
      }
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Server error during login" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to logout" });
        }
        res.clearCookie("connect.sid");
        return res.status(200).json({ message: "Logged out successfully" });
      });
    } else {
      return res.status(200).json({ message: "No active session" });
    }
  });

  // Get current user info
  app.get("/api/auth/me", isAuthenticated, async (req, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(req.session.userId as number);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password, ...userData } = user;
      res.json(userData);
    } catch (error) {
      console.error("Error fetching user data:", error);
      res.status(500).json({ message: "Failed to fetch user data" });
    }
  });

  return {
    isAuthenticated,
    isAdmin
  };
}