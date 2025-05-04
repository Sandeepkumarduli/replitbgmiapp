/**
 * DEPRECATED: This file is kept only for reference but is no longer used.
 * All authentication has been migrated to Supabase.
 * See supabase-auth.ts and supabase.ts for the new implementation.
 */

console.warn("Firebase module loaded but it's deprecated - using Supabase instead");

// Define types for compatibility with old code
type ConfirmationResult = {
  confirm: (code: string) => Promise<{ user: any }>;
};

/**
 * Sends OTP to the provided phone number
 * @deprecated Use Supabase auth instead
 */
export const sendOTP = async (
  phoneNumber: string,
  containerId?: string
): Promise<{ success: boolean; confirmationResult?: ConfirmationResult; error?: string }> => {
  console.error("Firebase sendOTP is deprecated - use Supabase auth.signInWithOtp() instead");
  
  return { 
    success: false, 
    error: "Firebase auth is no longer supported. The application has been migrated to Supabase."
  };
};

/**
 * Verifies the OTP entered by the user
 * @deprecated Use Supabase auth instead
 */
export const verifyOTP = async (
  confirmationResult: ConfirmationResult,
  otp: string
): Promise<{ success: boolean; user?: any; error?: string }> => {
  console.error("Firebase verifyOTP is deprecated - use Supabase auth.verifyOtp() instead");
  
  return { 
    success: false, 
    error: "Firebase auth is no longer supported. The application has been migrated to Supabase."
  };
};

/**
 * Clears any existing reCAPTCHA widgets
 * @deprecated No longer needed with Supabase
 */
export const clearRecaptcha = async (): Promise<void> => {
  console.error("Firebase clearRecaptcha is deprecated - no longer needed with Supabase");
  return;
};