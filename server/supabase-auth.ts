import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { supabase } from './supabase';
import { User, InsertUser } from "@shared/schema";
import { storage } from "./storage";
import createMemoryStore from "memorystore";

declare module "express-session" {
  interface SessionData {
    userId: number;
    username: string;
    role: string;
  }
}

export function setupSupabaseAuth(app: Express) {
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
      const { username, password, email, phone, gameId } = req.body;

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

      // Register with Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            phone,
            gameId,
            role: 'user'
          }
        }
      });

      if (authError) {
        console.error("Supabase auth error:", authError);
        return res.status(500).json({ message: authError.message });
      }

      // Create user in our database
      const newUser = await storage.createUser({
        username,
        password: 'supabase_managed', // We no longer store passwords ourselves
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
      if (username === "Sandeepkumarduli" && password === "Sandy@1234") {
        try {
          let adminUser = await storage.getUserByUsername(username);
          
          // If admin doesn't exist in storage, create it
          if (!adminUser) {
            const { data, error } = await supabase.auth.signUp({
              email: "admin@bgmi-tournaments.com",
              password,
              options: {
                data: {
                  username,
                  phone: "1234567890",
                  gameId: "admin",
                  role: 'admin'
                }
              }
            });
            
            if (error) {
              console.error("Admin supabase auth error:", error);
              return res.status(500).json({ message: error.message });
            }
            
            adminUser = await storage.createUser({
              username,
              password: 'supabase_managed',
              email: "admin@bgmi-tournaments.com",
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
            
            // Also authenticate with Supabase
            const { data, error } = await supabase.auth.signInWithPassword({
              email: adminUser.email,
              password
            });
            
            if (error) {
              if (error.status === 400) {
                // User not found in Supabase, create one
                const { data: authData, error: signUpError } = await supabase.auth.signUp({
                  email: adminUser.email,
                  password,
                  options: {
                    data: {
                      username,
                      phone: adminUser.phone,
                      gameId: adminUser.gameId,
                      role: 'admin'
                    }
                  }
                });
                
                if (signUpError) {
                  console.error("Admin supabase sign up error:", signUpError);
                  return res.status(500).json({ message: signUpError.message });
                }
              } else {
                console.error("Admin supabase sign in error:", error);
                return res.status(500).json({ message: error.message });
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

      // Authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password
      });
      
      if (error) {
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
    req.session.destroy(async (err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      
      // Also sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Supabase sign out error:", error);
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

      // If updating password, update it via Supabase
      if (password) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          return res.status(400).json({ message: error.message });
        }
      }

      // Prepare update data
      const updateData: Partial<User> = {};
      
      if (email) {
        // Update email via Supabase
        const { error } = await supabase.auth.updateUser({ email });
        if (error) {
          return res.status(400).json({ message: error.message });
        }
        updateData.email = email;
      }
      
      if (phone) updateData.phone = phone;
      if (gameId) updateData.gameId = gameId;

      // Update user profile data
      if (Object.keys(updateData).length > 0) {
        // Also update user metadata in Supabase
        await supabase.auth.updateUser({
          data: { 
            phone: updateData.phone || user.phone,
            gameId: updateData.gameId || user.gameId
          }
        });
        
        // Update in our database
        const updatedUser = await storage.updateUser(userId, updateData);
        if (!updatedUser) {
          return res.status(404).json({ message: "Failed to update user" });
        }

        // Return updated user without password
        const { password: _, ...userWithoutPassword } = updatedUser;
        return res.status(200).json(userWithoutPassword);
      } else {
        // No update was made to our database
        const { password: _, ...userWithoutPassword } = user;
        return res.status(200).json(userWithoutPassword);
      }
    } catch (error) {
      console.error("Update user error:", error);
      return res.status(500).json({ message: "Server error updating user" });
    }
  });

  // Return middleware functions for use in other routes
  return { isAuthenticated, isAdmin };
}