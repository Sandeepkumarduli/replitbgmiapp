import { Request, Response } from 'express';
import { supabase } from './supabase';
import { storage } from './storage';

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
    const { phone, otp } = req.body;
    
    if (!phone || !otp) {
      return res.status(400).json({ message: "Phone number and OTP are required" });
    }
    
    // First, verify the OTP with Supabase
    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: 'sms'
    });
    
    if (verifyError) {
      console.error("Error verifying OTP for phone login:", verifyError);
      return res.status(401).json({ message: "Invalid or expired OTP" });
    }
    
    // Find user with this phone number in our database
    const users = await storage.getUserByPhone(phone);
    
    if (!users) {
      return res.status(404).json({ message: "No user found with this phone number" });
    }
    
    // Update user phone verification status if not already verified
    if (!users.phoneVerified) {
      await storage.updateUser(users.id, {
        phoneVerified: true
      });
    }
    
    // Create a session for the user
    if (req.session) {
      req.session.userId = users.id;
      req.session.username = users.username;
      req.session.role = users.role;
    }
    
    console.log(`User ${users.username} logged in via phone OTP`);
    
    res.json({
      id: users.id,
      username: users.username,
      email: users.email,
      phone: users.phone,
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