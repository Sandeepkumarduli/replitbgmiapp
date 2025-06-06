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
  app.post("/api/auth/register", async (req, res) => {
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
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      // Handle admin login with hardcoded credentials
      const adminUsername = "Sandeepkumarduli";
      const adminEmail = "admin@bgmi-tournaments.com";
      const adminPassword = "Sandy@1234";
      
      console.log(`Login attempt for username: ${username} (comparing with admin: ${adminUsername})`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      
      // Use triple equals for exact string comparison
      const isAdminUsername = username === adminUsername;
      const isAdminEmail = username === adminEmail;
      const isAdminPassword = password === adminPassword;
      
      if ((isAdminUsername || isAdminEmail) && isAdminPassword) {
        console.log("Admin credentials match, proceeding with admin login");
        try {
          // Try to get admin by username first
          let adminUser = await storage.getUserByUsername(adminUsername);
          console.log("Admin user lookup result:", adminUser ? "Found" : "Not found");
          
          // If not found, check by email
          if (!adminUser && isAdminEmail) {
            adminUser = await storage.getUserByEmail(adminEmail);
            console.log("Admin email lookup result:", adminUser ? "Found" : "Not found");
          }
          
          // If admin doesn't exist in storage, create it
          if (!adminUser) {
            console.log("Creating new admin user");
            const hashedPassword = await hashPassword(adminPassword);
            adminUser = await storage.createUser({
              username: adminUsername,
              password: hashedPassword,
              email: adminEmail,
              phone: "1234567890",
              gameId: "admin",
              role: "admin",
              phoneVerified: true // Set to true by default for admin
            });
            console.log("Admin user created:", adminUser ? "Success" : "Failed");
          } else {
            // Ensure the user has admin role regardless of what's in storage
            console.log("Existing admin user found, checking role:", adminUser.role);
            if (adminUser.role !== "admin") {
              console.log("Updating user to admin role");
              const updatedAdmin = await storage.updateUser(adminUser.id, { 
                role: "admin",
                phoneVerified: true // Ensure phone is marked as verified for admin
              });
              if (updatedAdmin) {
                adminUser = updatedAdmin;
                console.log("Admin role update successful");
              } else {
                console.log("Admin role update failed");
              }
            }
          }
          
          // At this point we should have a valid admin user
          if (adminUser) {
            console.log("Setting admin session with ID:", adminUser.id);
            // Store admin info in session
            req.session.userId = adminUser.id;
            req.session.username = adminUser.username;
            req.session.role = "admin";
            
            // Explicitly save the session to ensure it's persisted
            await new Promise<void>((resolve, reject) => {
              req.session.save((err) => {
                if (err) {
                  console.error("Session save error:", err);
                  reject(err);
                } else {
                  console.log("Admin session saved successfully");
                  resolve();
                }
              });
            });
            
            // Return admin user without password
            const { password: _, ...adminWithoutPassword } = adminUser;
            console.log("Admin login successful, returning user data");
            return res.status(200).json(adminWithoutPassword);
          }
          
          // If we reach here, something went wrong with admin creation/update
          console.error("Failed to authenticate admin - user object invalid");
          return res.status(500).json({ message: "Failed to authenticate admin" });
        } catch (error) {
          console.error("Admin login error:", error);
          return res.status(500).json({ 
            message: "Server error during admin login",
            details: error instanceof Error ? error.message : String(error)
          });
        }
      } else if (username === adminUsername || username === adminEmail) {
        // This is an admin login attempt with wrong password
        console.log("Admin login attempt with incorrect password");
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

      // Get notification count for this user (includes broadcast notifications)
      try {
        const notificationCount = await storage.getUnreadNotificationsCount(user.id);
        console.log(`User ${user.id} logged in with ${notificationCount} unread notifications`);
      } catch (err) {
        console.error("Error getting notification count on login:", err);
      }

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Server error during login" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      return res.status(200).json({ message: "Logged out successfully" });
    });
  });

  // Get current user endpoint for authentication check
  app.get("/api/auth/me", async (req, res) => {
    try {
      // If not authenticated, return 401
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(req.session.userId);
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

  // Get current user endpoint (keeping for backward compatibility)
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
      const { email, phone, gameId, username, password, currentPassword } = req.body;
      const userId = req.session.userId!;

      console.log(`Processing profile update for user ID: ${userId}`);
      console.log("Update fields:", { 
        hasEmail: !!email, 
        hasPhone: !!phone,
        hasGameId: !!gameId,
        hasUsername: !!username,
        hasPassword: !!password
      });

      // Get current user
      const user = await storage.getUser(userId);
      if (!user) {
        console.error(`User with ID ${userId} not found for profile update`);
        return res.status(404).json({ message: "User not found" });
      }

      // If updating password, verify current password
      let passwordChanged = false;
      if (password) {
        if (!currentPassword) {
          return res.status(400).json({ message: "Current password is required to update password" });
        }

        const isPasswordValid = await comparePasswords(currentPassword, user.password);
        if (!isPasswordValid) {
          return res.status(400).json({ message: "Current password is incorrect" });
        }
        
        // Mark that password was changed - will require re-login
        passwordChanged = true;
      }

      // Prepare update data
      const updateData: Partial<User> = {};
      
      if (email) updateData.email = email;
      if (phone) updateData.phone = phone;
      if (gameId) updateData.gameId = gameId;
      if (username && username !== user.username) {
        // Check if username is already taken
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Username is already taken" });
        }
        updateData.username = username;
      }
      if (password) updateData.password = await hashPassword(password);

      console.log("Updating user profile with data:", Object.keys(updateData));
      
      // Only update if there are changes
      if (Object.keys(updateData).length === 0) {
        console.log("No profile changes detected");
        const { password: _, ...userWithoutPassword } = user;
        return res.status(200).json({
          ...userWithoutPassword,
          message: "No changes were made"
        });
      }

      // Update user
      const updatedUser = await storage.updateUser(userId, updateData);
      if (!updatedUser) {
        console.error(`Failed to update user ${userId} in database`);
        return res.status(404).json({ message: "Failed to update user" });
      }

      // Update the session username if it was changed
      if (updateData.username && req.session.username !== updateData.username) {
        req.session.username = updateData.username;
      }

      // Return updated user without password
      const { password: _, ...userWithoutPassword } = updatedUser;
      
      // If password was changed, require re-login by destroying the session
      if (passwordChanged) {
        console.log("Password changed, user will be logged out");
        return res.status(200).json({
          ...userWithoutPassword,
          passwordChanged: true,
          message: "Profile updated. Please log in again with your new password."
        });
      } else {
        console.log("Profile updated successfully");
        return res.status(200).json({
          ...userWithoutPassword,
          message: "Profile updated successfully"
        });
      }
    } catch (error) {
      console.error("Update user error:", error);
      return res.status(500).json({ message: "Server error updating user" });
    }
  });

  // Return middleware functions for use in other routes
  return { isAuthenticated, isAdmin };
}