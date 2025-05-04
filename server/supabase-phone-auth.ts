import { Request, Response } from 'express';
import { supabase } from './supabase';
import { storage } from './storage';

// Log diagnostic info about the Supabase client
console.log("Supabase phone auth module loaded");
console.log("Supabase client available:", supabase ? "Yes" : "No");
console.log("Supabase auth available:", supabase?.auth ? "Yes" : "No");

/**
 * Check if phone verification is required for a user
 */
export async function checkPhoneVerificationStatus(req: Request, res: Response) {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userId = req.session.userId;
    
    // Get user data
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    console.log(`Checking phone verification status for user:`, { id: userId, phoneVerified: user.phoneVerified, phone: user.phone });
    
    res.json({
      phoneVerified: user.phoneVerified || false,
      phone: user.phone || ''
    });
    
  } catch (error) {
    console.error("Error checking phone verification status:", error);
    res.status(500).json({ message: "Failed to check phone verification status" });
  }
}

/**
 * Update user's phone verification status
 */
export async function updatePhoneVerification(req: Request, res: Response) {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userId = req.session.userId;
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }
    
    // Update user in database
    const user = await storage.updateUser(userId, {
      phone,
      phoneVerified: true
    });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    console.log(`Updated phone verification status for user ${userId}`);
    
    res.json({
      success: true,
      message: "Phone verification updated successfully",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        phoneVerified: user.phoneVerified
      }
    });
    
  } catch (error) {
    console.error("Error updating phone verification:", error);
    res.status(500).json({ message: "Failed to update phone verification status" });
  }
}

/**
 * Login with phone number and OTP
 */
export async function phoneLogin(req: Request, res: Response) {
  try {
    const { phone, otp, dev_mode } = req.body;
    
    if (!phone || !otp) {
      return res.status(400).json({ message: "Phone number and OTP are required" });
    }
    
    // Format phone number if needed
    let formattedPhone = phone;
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = `+91${formattedPhone.replace(/^0+/, '')}`;
    }
    
    // Check if dev_mode is enabled and we're in a development environment
    const isDevMode = (dev_mode === true && process.env.NODE_ENV === 'development');
    let verifySuccess = false;
    
    console.log(`Phone login attempt: ${formattedPhone}, OTP ${otp.substring(0, 1)}*****${otp.substring(5)}${isDevMode ? ' (DEV MODE)' : ''}`);
    
    if (!isDevMode) {
      // Normal path: verify OTP with Supabase
      try {
        if (!supabase || !supabase.auth) {
          console.error("Supabase client or auth module is not available");
          return res.status(500).json({ message: "OTP verification service is not available" });
        }
        
        console.log("Verifying OTP with Supabase for phone:", formattedPhone);
        const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
          phone: formattedPhone,
          token: otp,
          type: 'sms'
        });
        
        if (verifyError) {
          console.error("Error verifying OTP for phone login:", verifyError);
          return res.status(401).json({ message: "Invalid or expired OTP" });
        }
        
        console.log("Supabase OTP verification successful:", verifyData ? "Has data" : "No data");
        verifySuccess = true;
      } catch (otpError) {
        console.error("Exception during OTP verification:", otpError);
        
        // Check if we're in development and credentials aren't available
        // This is a fallback in case the Supabase module throws rather than returning an error object
        if (process.env.NODE_ENV === 'development') {
          console.log("DEV MODE FALLBACK: Allowing verification in development environment");
          verifySuccess = true;
        } else {
          return res.status(500).json({ message: "OTP verification service unavailable" });
        }
      }
    } else {
      // Development mode - bypass OTP verification
      console.log("DEVELOPMENT MODE: Bypassing OTP verification");
      verifySuccess = true;
    }
    
    // Find user with this phone number in our database
    console.log("Looking up user by phone number:", formattedPhone);
    const users = await storage.getUserByPhone(formattedPhone);
    
    if (!users) {
      console.error("No user found with phone number:", formattedPhone);
      
      // In development, get a list of users for debugging
      if (process.env.NODE_ENV === 'development') {
        const allUsers = await storage.getAllUsers();
        console.log("Available users:", 
          allUsers.map(u => ({ id: u.id, username: u.username, phone: u.phone }))
        );
      }
      
      return res.status(404).json({ message: "No user found with this phone number" });
    }
    
    console.log("User found:", { id: users.id, username: users.username, phone: users.phone });
    
    // Update user phone verification status if not already verified
    if (!users.phoneVerified && verifySuccess) {
      console.log("Updating phone verification status to true");
      await storage.updateUser(users.id, {
        phoneVerified: true,
        phone: formattedPhone // Ensure phone is saved in correct format
      });
      console.log(`Updated phone verification status for user ${users.id} (${users.username})`);
    }
    
    // Create a session for the user
    if (req.session) {
      req.session.userId = users.id;
      req.session.username = users.username;
      req.session.role = users.role;
      console.log("Session created for user:", users.id);
    } else {
      console.error("Session object not available");
    }
    
    console.log(`User ${users.username} logged in via phone OTP`);
    
    res.json({
      id: users.id,
      username: users.username,
      email: users.email,
      phone: users.phone || formattedPhone,
      phoneVerified: true,
      role: users.role,
      gameId: users.gameId
    });
    
  } catch (error) {
    console.error("Error in phone login:", error);
    res.status(500).json({ message: "Failed to login with phone" });
  }
}

/**
 * Register phone authentication routes
 */
export function registerSupabasePhoneAuthRoutes(app: any) {
  // Check phone verification status
  app.get('/api/auth/phone-verification-status', checkPhoneVerificationStatus);
  
  // Update phone verification status after successful verification
  app.post('/api/auth/phone-verification', updatePhoneVerification);
  
  // Phone login with OTP
  app.post('/api/auth/phone-login', phoneLogin);
}

export default {
  registerSupabasePhoneAuthRoutes,
  checkPhoneVerificationStatus,
  updatePhoneVerification,
  phoneLogin
};