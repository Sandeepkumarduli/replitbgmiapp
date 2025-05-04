import { supabase } from './supabase';

/**
 * Sends OTP to the provided phone number using Supabase Authentication
 */
export const sendOTP = async (
  phoneNumber: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log("Preparing to send OTP via Supabase to:", phoneNumber);
    console.log("Using Supabase client:", supabase ? "Available" : "Missing");
    
    // Format phone number if needed
    if (!phoneNumber.startsWith('+')) {
      phoneNumber = `+91${phoneNumber.replace(/^0+/, '')}`;
      console.log("Formatted phone number:", phoneNumber);
    }
    
    // If supabase is the dummy client, handle it specially
    if (!supabase.auth || typeof supabase.auth.signInWithOtp !== 'function') {
      console.warn("Using dummy Supabase client for OTP - this won't send real messages");
      if (import.meta.env.DEV) {
        return { 
          success: true,
          error: "Development mode - using code 123456" 
        };
      } else {
        return { 
          success: false, 
          error: "Supabase authentication is not available. Check configuration." 
        };
      }
    }
    
    // Attempt to send OTP through Supabase Auth
    console.log("Calling Supabase auth.signInWithOtp...");
    const { error } = await supabase.auth.signInWithOtp({
      phone: phoneNumber,
    });
    
    if (error) {
      console.error("Supabase OTP error:", error);
      return { 
        success: false, 
        error: `Failed to send verification code: ${error.message}` 
      };
    }
    
    console.log("OTP sent successfully to phone via Supabase");
    return { success: true };
    
  } catch (error) {
    console.error("Error sending OTP via Supabase:", error);
    
    // Provide better error messages
    if (error instanceof Error) {
      if (error.message.includes("phone")) {
        return { success: false, error: "Invalid phone number format. Please use format: +91XXXXXXXXXX" };
      } else {
        return { success: false, error: `Failed to send verification code: ${error.message}` };
      }
    } else {
      return { success: false, error: "An unknown error occurred. Please try again." };
    }
  }
};

/**
 * Verifies the OTP entered by the user
 */
export const verifyOTP = async (
  phoneNumber: string,
  otp: string
): Promise<{ success: boolean; user?: any; error?: string }> => {
  try {
    console.log("Verifying OTP code with Supabase...");
    
    // Format phone number if needed
    if (!phoneNumber.startsWith('+')) {
      phoneNumber = `+91${phoneNumber.replace(/^0+/, '')}`;
    }
    
    // Verify the OTP code
    const { data, error } = await supabase.auth.verifyOtp({
      phone: phoneNumber,
      token: otp,
      type: 'sms'
    });
    
    if (error) {
      console.error("Error verifying OTP with Supabase:", error);
      return { 
        success: false, 
        error: `Verification failed: ${error.message}` 
      };
    }
    
    console.log("OTP verification successful with Supabase");
    return { success: true, user: data.user };
    
  } catch (error) {
    console.error("Error verifying OTP with Supabase:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("verification")) {
        return { success: false, error: "Invalid verification code. Please check and try again." };
      } else if (error.message.includes("expired")) {
        return { success: false, error: "Verification code has expired. Please request a new code." };
      } else {
        return { success: false, error: `Verification failed: ${error.message}` };
      }
    } else {
      return { success: false, error: "An unknown error occurred. Please try again." };
    }
  }
};

/**
 * Update a user's phone number in the database and mark it as verified
 */
export const updateVerifiedPhone = async (
  userId: number, 
  phone: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Update user's phone and phoneVerified status in our database
    const { error } = await supabase
      .from('users')
      .update({ 
        phone: phone, 
        phoneVerified: true 
      })
      .eq('id', userId);

    if (error) {
      console.error("Error updating verified phone:", error);
      return { 
        success: false, 
        error: `Failed to update phone verification status: ${error.message}` 
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in updateVerifiedPhone:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
};

/**
 * Check if a user's phone is verified
 */
export const checkPhoneVerified = async (
  userId: number
): Promise<{ verified: boolean; phone?: string; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('phone, phoneVerified')
      .eq('id', userId)
      .single();

    if (error) {
      console.error("Error checking phone verification status:", error);
      return { 
        verified: false, 
        error: `Failed to check verification status: ${error.message}` 
      };
    }

    return { 
      verified: data?.phoneVerified || false,
      phone: data?.phone 
    };
  } catch (error) {
    console.error("Error in checkPhoneVerified:", error);
    return { 
      verified: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
};