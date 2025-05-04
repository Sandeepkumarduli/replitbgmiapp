import { Request, Response } from "express";
import { storage } from "./storage";
import { logSecurityEvent } from "./auth-security";
import { z } from "zod";
import { checkPhoneVerificationStatus as supabaseCheckPhoneVerificationStatus, 
         updatePhoneVerification as supabaseUpdatePhoneVerification } from "./supabase-phone-auth";

/**
 * DEPRECATED: Firebase phone verification has been replaced with Supabase.
 * This file is maintained for backwards compatibility.
 * See supabase-phone-auth.ts for the new implementation.
 */

/**
 * Validate phone verification result from client
 * This validates user's phone verification from Firebase
 * @deprecated Use Supabase phone auth instead
 */
export async function verifyPhoneHandler(req: Request, res: Response) {
  console.warn("DEPRECATED: Firebase verifyPhoneHandler called - redirecting to Supabase implementation");
  
  // Use Supabase implementation instead
  try {
    // Transform request to the format expected by Supabase implementation
    // For compatibility with existing clients still using this endpoint
    if (req.body.phoneNumber && !req.body.phone) {
      req.body.phone = req.body.phoneNumber;
    }
    
    // Log the redirection
    console.log("Redirecting Firebase phone verification to Supabase implementation");
    
    // Call Supabase implementation
    return await supabaseUpdatePhoneVerification(req, res);
    
  } catch (error) {
    console.error("Error during phone verification redirect:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ message: "Internal server error", details: errorMessage });
  }
}

/**
 * Check if phone verification is required for a user
 * @deprecated Use Supabase phone auth instead
 */
export async function checkPhoneVerificationStatus(req: Request, res: Response) {
  console.warn("DEPRECATED: Firebase checkPhoneVerificationStatus called - redirecting to Supabase implementation");
  
  // Use Supabase implementation instead
  try {
    // Call Supabase implementation
    return await supabaseCheckPhoneVerificationStatus(req, res);
    
  } catch (error) {
    console.error("Error during phone verification status check redirect:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Handle bypass of phone verification (DISABLED)
 * 
 * As per project requirements, phone verification is strictly mandatory with no bypass option.
 * This handler is kept for reference only and always returns a 403 error.
 */
export async function bypassPhoneVerificationHandler(req: Request, res: Response) {
  // Log the bypass attempt for security auditing
  logSecurityEvent("phone_verification_bypass_attempt", req, { 
    userId: req.session?.userId || 'unknown',
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  
  // Return a strong rejection message
  return res.status(403).json({
    message: "Phone verification is mandatory and cannot be bypassed",
    details: "For security reasons, all users must complete phone verification. Please contact support if you're having issues with the verification process."
  });
}

/**
 * Register phone authentication routes
 * @deprecated Use Supabase phone auth instead by calling registerSupabasePhoneAuthRoutes
 */
export function registerPhoneAuthRoutes(app: any) {
  console.warn("DEPRECATED: Firebase registerPhoneAuthRoutes called - routes will redirect to Supabase implementation");
  
  // Route to verify phone (redirects to Supabase implementation)
  app.post("/api/auth/verify-phone", verifyPhoneHandler);
  
  // Route to check phone verification status (redirects to Supabase implementation)
  app.get("/api/auth/phone-verification-status", checkPhoneVerificationStatus);
  
  // Route to bypass phone verification (maintained for security auditing)
  app.post("/api/auth/bypass-phone-verification", bypassPhoneVerificationHandler);
}