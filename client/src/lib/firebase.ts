import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult
} from "firebase/auth";

// Firebase configuration - using environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "rdtournamentshub-f08c5",
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "rdtournamentshub-f08c5"}.appspot.com`,
  messagingSenderId: "590155313623",
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Log the configuration for debugging
console.log("Firebase config:", {
  apiKey: firebaseConfig.apiKey ? "[PRESENT]" : "[MISSING]",
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  appId: firebaseConfig.appId ? "[PRESENT]" : "[MISSING]"
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);
console.log("Firebase initialized successfully");

// Get auth instance
const auth = getAuth(app);

// Track reCAPTCHA instance to avoid multiple instances
let recaptchaVerifier: RecaptchaVerifier | null = null;

/**
 * Sends OTP to the provided phone number
 */
export const sendOTP = async (
  phoneNumber: string,
  containerId: string
): Promise<{ success: boolean; confirmationResult?: ConfirmationResult; error?: string }> => {
  try {
    console.log("Preparing to send OTP to:", phoneNumber);
    
    // Format phone number if needed
    if (!phoneNumber.startsWith('+')) {
      phoneNumber = `+91${phoneNumber.replace(/^0+/, '')}`;
      console.log("Formatted phone number:", phoneNumber);
    }
    
    // Clear previous reCAPTCHA if exists
    if (recaptchaVerifier) {
      try {
        await recaptchaVerifier.clear();
      } catch (e) {
        console.log("Error clearing previous reCAPTCHA:", e);
      }
      recaptchaVerifier = null;
    }
    
    // Create invisible reCAPTCHA verifier
    recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: (response: any) => {
        console.log("reCAPTCHA verified:", response ? "success" : "failed");
      }
    });
    
    console.log("reCAPTCHA verifier created");
    
    // Send verification code
    const confirmationResult = await signInWithPhoneNumber(
      auth,
      phoneNumber,
      recaptchaVerifier
    );
    
    console.log("OTP sent successfully to phone");
    return { success: true, confirmationResult };
    
  } catch (error) {
    console.error("Error sending OTP:", error);
    
    // Clean up on error
    if (recaptchaVerifier) {
      try {
        await recaptchaVerifier.clear();
      } catch (e) {
        console.log("Error clearing reCAPTCHA:", e);
      }
      recaptchaVerifier = null;
    }
    
    // Provide better error messages
    if (error instanceof Error) {
      if (error.message.includes("invalid-phone-number")) {
        return { success: false, error: "Invalid phone number format. Please use format: +91XXXXXXXXXX" };
      } else if (error.message.includes("quota-exceeded")) {
        return { success: false, error: "SMS quota exceeded. Please try again later." };
      } else if (error.message.includes("captcha-check-failed")) {
        return { success: false, error: "reCAPTCHA verification failed. Please refresh and try again." };
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
  confirmationResult: ConfirmationResult,
  otp: string
): Promise<{ success: boolean; user?: any; error?: string }> => {
  try {
    console.log("Verifying OTP code...");
    
    const result = await confirmationResult.confirm(otp);
    console.log("OTP verification successful");
    
    return { success: true, user: result.user };
    
  } catch (error) {
    console.error("Error verifying OTP:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("invalid-verification-code")) {
        return { success: false, error: "Invalid verification code. Please check and try again." };
      } else if (error.message.includes("code-expired")) {
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
 * Clears any existing reCAPTCHA widgets
 */
export const clearRecaptcha = async (): Promise<void> => {
  if (recaptchaVerifier) {
    try {
      await recaptchaVerifier.clear();
      console.log("reCAPTCHA cleared successfully");
    } catch (error) {
      console.error("Error clearing reCAPTCHA:", error);
    } finally {
      recaptchaVerifier = null;
    }
  }
};