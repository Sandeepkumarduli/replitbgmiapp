import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult
} from "firebase/auth";

// Firebase configuration - hardcoded for simplicity and to ensure it works
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: "590155313623", // Required for Phone Authentication
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
let app = initializeApp(firebaseConfig);
console.log("Firebase initialized with project:", firebaseConfig.projectId);

// Get auth instance
const auth = getAuth(app);

// Track reCAPTCHA instance
let recaptchaVerifier: RecaptchaVerifier | null = null;

/**
 * Sends OTP to the provided phone number
 */
export const sendOTP = async (
  phoneNumber: string,
  containerId: string
): Promise<{ success: boolean; confirmationResult?: ConfirmationResult; error?: string }> => {
  try {
    console.log("Sending OTP to:", phoneNumber);
    
    // Format phone number if needed
    if (!phoneNumber.startsWith('+')) {
      phoneNumber = `+91${phoneNumber.replace(/^0+/, '')}`;
      console.log("Formatted phone number:", phoneNumber);
    }
    
    // Clear previous reCAPTCHA
    if (recaptchaVerifier) {
      try {
        await recaptchaVerifier.clear();
      } catch (e) {
        console.log("Error clearing previous reCAPTCHA");
      }
      recaptchaVerifier = null;
    }
    
    // Get container element
    const containerElement = document.getElementById(containerId);
    if (!containerElement) {
      return { success: false, error: "reCAPTCHA container not found" };
    }
    
    // Create new reCAPTCHA
    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: "normal",
      callback: () => console.log("reCAPTCHA solved"),
      "expired-callback": () => console.log("reCAPTCHA expired"),
      "error-callback": () => console.log("reCAPTCHA error")
    });
    
    // Render reCAPTCHA
    await recaptchaVerifier.render();
    
    // Send verification code
    const confirmationResult = await signInWithPhoneNumber(
      auth,
      phoneNumber,
      recaptchaVerifier
    );
    
    console.log("OTP sent successfully");
    return { success: true, confirmationResult };
    
  } catch (error) {
    console.error("Error sending OTP:", error);
    
    // Clean up on error
    if (recaptchaVerifier) {
      try {
        await recaptchaVerifier.clear();
      } catch (e) {
        console.log("Error clearing reCAPTCHA");
      }
      recaptchaVerifier = null;
    }
    
    // Simplify error message
    if (error instanceof Error) {
      if (error.message.includes("invalid-phone-number")) {
        return { success: false, error: "Invalid phone number format. Please use format: +91XXXXXXXXXX" };
      } else {
        return { success: false, error: "Failed to send verification code. Please check your phone number." };
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
    console.log("Verifying OTP:", otp);
    
    const result = await confirmationResult.confirm(otp);
    console.log("OTP verified successfully");
    
    return { success: true, user: result.user };
    
  } catch (error) {
    console.error("Error verifying OTP:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("invalid-verification-code")) {
        return { success: false, error: "Invalid code. Please check and try again." };
      } else if (error.message.includes("code-expired")) {
        return { success: false, error: "Code expired. Please request a new code." };
      } else {
        return { success: false, error: "Failed to verify code. Please try again." };
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
    } catch (error) {
      console.error("Error clearing reCAPTCHA:", error);
    } finally {
      recaptchaVerifier = null;
    }
  }
};