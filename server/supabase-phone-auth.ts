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
 * Register phone authentication routes
 */
export function registerSupabasePhoneAuthRoutes(app: any) {
  // Check phone verification status
  app.get('/api/auth/phone-verification-status', checkPhoneVerificationStatus);
  
  // Update phone verification status after successful verification
  app.post('/api/auth/phone-verification', updatePhoneVerification);
}

export default {
  registerSupabasePhoneAuthRoutes,
  checkPhoneVerificationStatus,
  updatePhoneVerification
};