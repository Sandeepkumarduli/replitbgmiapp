import { Request, Response } from "express";
import { storage } from "./storage";
import { logSecurityEvent } from "./auth-security";
import { z } from "zod";

/**
 * Validate phone verification result from client
 * This validates user's phone verification from Firebase
 */
export async function verifyPhoneHandler(req: Request, res: Response) {
  try {
    // Validate request body
    const verifySchema = z.object({
      userId: z.number(),
      firebaseUid: z.string(),
      phoneNumber: z.string()
    });

    const result = verifySchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    const { userId, firebaseUid, phoneNumber } = result.data;

    // Security check: Only allow users to verify their own phone number
    if (req.session?.userId && req.session.userId !== userId) {
      logSecurityEvent("unauthorized_phone_verification_attempt", req, { 
        attemptedUserId: userId,
        sessionUserId: req.session.userId
      });
      return res.status(403).json({ message: "Unauthorized action" });
    }

    // Get user from database
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify the phone number matches
    if (user.phone !== phoneNumber) {
      logSecurityEvent("phone_verification_mismatch", req, {
        userId: userId,
        storedPhone: user.phone,
        attemptedPhone: phoneNumber
      });
      return res.status(400).json({ message: "Phone number mismatch" });
    }

    // Update user with verification status and Firebase UID
    const updatedUser = await storage.updateUser(userId, {
      phoneVerified: true,
      firebaseUid
    });

    if (!updatedUser) {
      return res.status(500).json({ message: "Failed to update verification status" });
    }

    // Log successful verification
    logSecurityEvent("phone_verification_success", req, { userId });

    return res.status(200).json({ message: "Phone verification successful" });
  } catch (error) {
    console.error("Error during phone verification:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Check if phone verification is required for a user
 */
export async function checkPhoneVerificationStatus(req: Request, res: Response) {
  try {
    // Only allow authenticated users
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userId = req.session.userId;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return verification status
    return res.status(200).json({ 
      phoneVerified: user.phoneVerified === true,
      phone: user.phone
    });
  } catch (error) {
    console.error("Error checking phone verification status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Register phone authentication routes
 */
export function registerPhoneAuthRoutes(app: any) {
  // Route to verify phone
  app.post("/api/auth/verify-phone", verifyPhoneHandler);
  
  // Route to check phone verification status
  app.get("/api/auth/phone-verification-status", checkPhoneVerificationStatus);
}