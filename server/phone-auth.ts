import { Request, Response } from "express";
import { storage } from "./storage";
import { z } from "zod";

/**
 * Validate phone verification result from client
 * This validates user's phone verification from Firebase
 */
export async function verifyPhoneHandler(req: Request, res: Response) {
  try {
    // Validate request body
    const schema = z.object({
      userId: z.number(), // The user ID to update
      firebaseUid: z.string(), // The Firebase UID from successful verification
      phoneNumber: z.string() // Verified phone number
    });

    const { userId, firebaseUid, phoneNumber } = schema.parse(req.body);

    // Verify the user exists
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify the request is authorized - check session user id matches requested user id
    if (req.user?.id !== userId) {
      return res.status(403).json({ message: "Unauthorized to update this user" });
    }

    // Verify the phone number matches what we have on record
    if (user.phone !== phoneNumber) {
      return res.status(400).json({ 
        message: "Phone number mismatch. The verified number doesn't match user's registered number." 
      });
    }

    // Update user to mark phone as verified
    const updatedUser = await storage.updateUser(userId, {
      phoneVerified: true,
      firebaseUid: firebaseUid
    });

    if (!updatedUser) {
      return res.status(500).json({ message: "Failed to update user verification status" });
    }

    // Respond with success
    return res.status(200).json({
      message: "Phone verification successful",
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        phoneVerified: updatedUser.phoneVerified
      }
    });
  } catch (error) {
    console.error("Phone verification error:", error);
    return res.status(400).json({ 
      message: error instanceof Error ? error.message : "Invalid verification request" 
    });
  }
}

/**
 * Check if phone verification is required for a user
 */
export async function checkPhoneVerificationStatus(req: Request, res: Response) {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Return the user's phone verification status
    return res.status(200).json({
      phoneVerified: req.user.phoneVerified || false
    });
  } catch (error) {
    console.error("Phone verification status check error:", error);
    return res.status(500).json({ 
      message: error instanceof Error ? error.message : "Error checking verification status"
    });
  }
}

/**
 * Register phone authentication routes
 */
export function registerPhoneAuthRoutes(app: any) {
  app.post('/api/auth/verify-phone', verifyPhoneHandler);
  app.get('/api/auth/phone-verification-status', checkPhoneVerificationStatus);
}