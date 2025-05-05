/**
 * Enhanced authentication module specifically for Supabase integration
 * Replaces conflicting auth endpoints with a single implementation
 */

import { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { hashPassword, comparePasswords } from "./auth";
import { User, InsertUser, insertUserSchema, Admin, InsertAdmin, insertAdminSchema } from "@shared/schema";
import { logSecurityEvent } from "./auth-security";
import session from "express-session";

// Extend Express Session type to include our custom fields
declare module "express-session" {
  interface SessionData {
    userId: number;
    username: string;
    role: string;
    isFromAdminTable?: boolean;
  }
}

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
    
    // Check if this is a session from the admins table
    if (req.session.isFromAdminTable && req.session.role === 'admin') {
      // Verify admin still exists and is active
      const admin = await storage.getAdmin(req.session.userId);
      if (!admin || !admin.isActive) {
        return res.status(403).json({ message: "Admin account inactive or not found" });
      }
      
      // Admin is valid and active
      return next();
    }
    
    // Special case for mock admin in dev mode
    if (req.session.userId === 999999 && req.session.role === 'admin') {
      return next();
    }
    
    // Check regular user with admin role
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
          phoneVerificationBypassed: true // Skip verification as requested
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

  // Admin login check using Admins table
  const checkAdminCredentials = async (username: string, password: string): Promise<Admin | null> => {
    try {
      // Check if admin exists in admins table
      const admin = await storage.getAdminByUsername(username);
      if (!admin) return null;
      
      // Verify password
      const isPasswordValid = await comparePasswords(password, admin.password);
      if (!isPasswordValid) return null;
      
      return admin;
    } catch (error) {
      console.error("Error checking admin credentials:", error);
      return null;
    }
  };

  // Check for hardcoded admin to migrate to database
  const checkHardcodedAdmin = (username: string, password: string): boolean => {
    return username === "Sandeepkumarduli" && password === "Sandy@1234";
  };

  // Fix login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password, role } = req.body;
      
      // Log login attempt for security monitoring
      logSecurityEvent("login_attempt", req, { username, hasRole: !!role });

      // First check if this is an admin from the admins table
      const adminUser = await checkAdminCredentials(username, password);
      
      if (adminUser) {
        console.log("Admin login successful from Admins table");
        
        // Set admin session
        if (req.session) {
          req.session.userId = adminUser.id;
          req.session.username = adminUser.username;
          req.session.role = "admin"; // Force admin role
          req.session.isFromAdminTable = true; // Mark that this is from admins table
          
          // Reset login attempts for admin
          resetLoginAttempts(req);
          
          // Update last login timestamp
          await storage.updateAdmin(adminUser.id, {
            lastLogin: new Date()
          });
          
          // Remove password from response
          const { password: _, ...adminData } = adminUser;
          return res.status(200).json({
            ...adminData,
            role: "admin" // Ensure role is set to admin
          });
        } else {
          console.error("Session object not available for admin login");
          return res.status(500).json({ message: "Session not available" });
        }
      }
      
      // Special case for hardcoded admin - for backward compatibility
      if (checkHardcodedAdmin(username, password)) {
        console.log("Hardcoded admin login detected - migrating to Admins table");
        
        // Check if admin exists in users table
        let userAdmin = await storage.getUserByUsername(username);
        
        // Check if the admin exists in the admins table
        let dbAdmin = await storage.getAdminByUsername(username);
        
        if (!dbAdmin) {
          // Create the admin in the admins table
          try {
            dbAdmin = await storage.createAdmin({
              username: username,
              password: await hashPassword(password),
              email: "admin@bgmi-tournaments.com",
              phone: "1234567890",
              displayName: "Sandeep Kumar Duli",
              accessLevel: "owner"
              // isActive is automatically set to true by default in the schema
            });
            console.log("Created admin in Admins table");
          } catch (error) {
            console.error("Failed to create admin in Admins table:", error);
            
            // Fallback to mock admin
            dbAdmin = {
              id: 999999,
              username: username,
              password: await hashPassword(password),
              email: "admin@bgmi-tournaments.com",
              phone: "1234567890",
              displayName: "Sandeep Kumar Duli",
              accessLevel: "owner",
              isActive: true,
              createdAt: new Date(),
              lastLogin: null
            } as Admin;
            console.log("Using mock admin user for development");
          }
        }
        
        // Set admin session
        if (req.session) {
          req.session.userId = dbAdmin.id;
          req.session.username = dbAdmin.username;
          req.session.role = "admin"; // Force admin role
          req.session.isFromAdminTable = true; // Mark that this is from admins table
          
          // Reset login attempts for admin
          resetLoginAttempts(req);
          
          // Remove password from response
          const { password: _, ...adminData } = dbAdmin;
          return res.status(200).json({
            ...adminData,
            role: "admin" // Ensure role is set to admin
          });
        } else {
          console.error("Session object not available for admin login");
          return res.status(500).json({ message: "Session not available" });
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
      
      // Check if this session is from the admins table
      if (req.session.isFromAdminTable && req.session.role === 'admin') {
        console.log("Fetching admin data from Admins table");
        
        // Get admin from admins table
        const admin = await storage.getAdmin(req.session.userId as number);
        
        if (!admin) {
          console.log("Admin not found in database, session may be invalid");
          
          // Special case for our mock admin user in dev mode
          if (req.session.userId === 999999) {
            console.log("Using mock admin data for /api/auth/me");
            return res.json({
              id: 999999,
              username: req.session.username,
              email: "admin@bgmi-tournaments.com",
              phone: "1234567890",
              displayName: "Sandeep Kumar Duli",
              role: "admin",
              accessLevel: "owner",
              isActive: true,
              createdAt: new Date(),
              lastLogin: new Date()
            });
          }
          
          return res.status(404).json({ message: "Admin not found" });
        }
        
        // Remove password from response and add role field
        const { password: _, ...adminData } = admin;
        return res.json({
          ...adminData,
          role: "admin" // Ensure role is set
        });
      }
      
      // Special case for our mock admin user in dev mode - legacy support
      if (req.session.userId === 999999 && req.session.role === 'admin') {
        console.log("Using mock admin data for /api/auth/me");
        return res.json({
          id: 999999,
          username: req.session.username,
          email: "admin@bgmi-tournaments.com",
          phone: "1234567890",
          gameId: "admin",
          role: "admin",
          phoneVerified: true,
          phoneVerificationBypassed: true,
          createdAt: new Date()
        });
      }
      
      // Regular user handling
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