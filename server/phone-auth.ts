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
    console.log("Received phone verification request:", {
      body: req.body,
      sessionUserId: req.session?.userId
    });
    
    // Validate request body
    const verifySchema = z.object({
      userId: z.number(),
      firebaseUid: z.string(),
      phoneNumber: z.string()
    });

    const result = verifySchema.safeParse(req.body);
    
    if (!result.success) {
      console.error("Invalid phone verification request data:", result.error.format());
      return res.status(400).json({ 
        message: "Invalid request data", 
        details: result.error.format() 
      });
    }

    const { userId, firebaseUid, phoneNumber } = result.data;
    console.log("Parsed verification data:", { userId, firebaseUid, phoneNumber });

    // Security check: Only allow users to verify their own phone number
    if (req.session?.userId && req.session.userId !== userId) {
      const securityDetails = { 
        attemptedUserId: userId,
        sessionUserId: req.session.userId
      };
      console.error("Unauthorized phone verification attempt:", securityDetails);
      logSecurityEvent("unauthorized_phone_verification_attempt", req, securityDetails);
      return res.status(403).json({ message: "Unauthorized action" });
    }

    // Get user from database
    const user = await storage.getUser(userId);
    
    if (!user) {
      console.error(`User not found for phone verification. User ID: ${userId}`);
      return res.status(404).json({ message: "User not found" });
    }
    
    console.log("Retrieved user for verification:", {
      id: user.id,
      phone: user.phone,
      phoneVerified: user.phoneVerified
    });

    // Verify the phone number matches
    if (user.phone !== phoneNumber) {
      const mismatchDetails = {
        userId: userId,
        storedPhone: user.phone,
        attemptedPhone: phoneNumber
      };
      console.error("Phone number mismatch during verification:", mismatchDetails);
      logSecurityEvent("phone_verification_mismatch", req, mismatchDetails);
      return res.status(400).json({ 
        message: "Phone number mismatch", 
        details: mismatchDetails 
      });
    }

    // Update user with verification status and Firebase UID
    console.log("Updating user verification status:", { userId, firebaseUid });
    const updatedUser = await storage.updateUser(userId, {
      phoneVerified: true,
      firebaseUid
    });

    if (!updatedUser) {
      console.error(`Failed to update verification status for user ${userId}`);
      return res.status(500).json({ message: "Failed to update verification status" });
    }
    
    console.log("User phone verification successful:", { 
      userId, 
      phone: phoneNumber,
      firebaseUid
    });

    // Log successful verification
    logSecurityEvent("phone_verification_success", req, { userId });

    return res.status(200).json({ 
      message: "Phone verification successful",
      phoneVerified: true
    });
  } catch (error) {
    console.error("Error during phone verification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ message: "Internal server error", details: errorMessage });
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