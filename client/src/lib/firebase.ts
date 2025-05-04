import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult,
  PhoneAuthProvider
} from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: "590155313623",
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
console.log("Firebase initialized with project:", firebaseConfig.projectId);

// Get auth instance
const auth = getAuth(app);

// For mocking verification during development
let mockConfirmationResult: any = null;

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
    
    // For development: Create a mock confirmation result
    // In production, this would use the actual Firebase phone authentication
    mockConfirmationResult = {
      verificationId: "mock-verification-id-" + Date.now(),
      confirm: async (code: string) => {
        // Simulate verification
        if (code === "123456") {
          return {
            user: {
              uid: "mock-user-" + Date.now(),
              phoneNumber: phoneNumber
            }
          };
        } else {
          throw new Error("Invalid verification code");
        }
      }
    };
    
    console.log("OTP sent successfully (simulated)");
    return { success: true, confirmationResult: mockConfirmationResult };
    
  } catch (error) {
    console.error("Error sending OTP:", error);
    
    if (error instanceof Error) {
      return { success: false, error: "Failed to send verification code. Please try again." };
    } else {
      return { success: false, error: "An unknown error occurred. Please try again." };
    }
  }
};

/**
 * Verifies the OTP entered by the user
 */
export const verifyOTP = async (
  confirmationResult: any,
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
      if (error.message.includes("Invalid verification code")) {
        return { success: false, error: "Invalid code. Please enter 123456 to verify." };
      } else {
        return { success: false, error: "Failed to verify code. Please try again." };
      }
    } else {
      return { success: false, error: "An unknown error occurred. Please try again." };
    }
  }
};

/**
 * Clears any existing reCAPTCHA widgets (not used with our approach)
 */
export const clearRecaptcha = async (): Promise<void> => {
  // No need to clear anything with our approach
};