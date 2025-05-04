import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  PhoneAuthProvider, 
  ConfirmationResult
} from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: "590155313623", // Required for Phone Authentication
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase only once
let app: ReturnType<typeof initializeApp>;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  console.error("Firebase initialization error:", error);
  throw new Error("Firebase initialization failed");
}

// Get auth instance
const auth = getAuth(app);

// Keep track of recaptcha instance
let recaptchaVerifier: RecaptchaVerifier | null = null;

/**
 * Sends OTP to the provided phone number
 * @param phoneNumber E.164 formatted phone number
 * @param containerId ID of container element for reCAPTCHA
 * @returns Object with success flag and confirmation result or error message
 */
export const sendOTP = async (
  phoneNumber: string,
  containerId: string
): Promise<{ success: boolean; confirmationResult?: ConfirmationResult; error?: string }> => {
  try {
    console.log("Attempting to send OTP to:", phoneNumber);
    
    // Validate phone number format more strictly
    if (!phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
      console.error("Invalid phone number format:", phoneNumber);
      return { 
        success: false, 
        error: "Phone number must be in E.164 format (e.g., +91XXXXXXXXXX). Make sure your number includes the country code." 
      };
    }

    // Log phone number details for debugging
    console.log("Phone number details:", {
      length: phoneNumber.length,
      startsWithPlus: phoneNumber.startsWith('+'),
      containsOnlyDigitsAfterPlus: phoneNumber.substring(1).match(/^\d+$/) !== null
    });

    // Clear any existing recaptcha
    if (recaptchaVerifier) {
      try {
        await recaptchaVerifier.clear();
        console.log("Successfully cleared existing reCAPTCHA");
      } catch (e) {
        console.error("Error clearing recaptcha:", e);
      }
      recaptchaVerifier = null;
    }

    console.log("Creating new reCAPTCHA verifier in container:", containerId);
    const containerElement = document.getElementById(containerId);
    if (!containerElement) {
      console.error("Container element not found:", containerId);
      return { success: false, error: "reCAPTCHA container not found" };
    }
    
    // Make sure container is empty
    containerElement.innerHTML = '';
    
    // Create new reCAPTCHA verifier with more detailed settings
    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: "normal",
      callback: (response: string) => {
        console.log("reCAPTCHA solved successfully, response token:", response ? "present" : "missing");
      },
      "expired-callback": () => {
        console.log("reCAPTCHA expired, needs to be solved again");
      },
      "error-callback": (error: Error) => {
        console.error("reCAPTCHA error:", error);
      }
    });

    // Render the reCAPTCHA
    console.log("Rendering reCAPTCHA");
    await recaptchaVerifier.render();
    console.log("reCAPTCHA rendered successfully");

    // Send verification code
    console.log("Sending verification code to:", phoneNumber);
    const confirmationResult = await signInWithPhoneNumber(
      auth,
      phoneNumber,
      recaptchaVerifier
    );

    console.log("Verification code sent successfully");
    return { success: true, confirmationResult };
  } catch (error) {
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error("Error sending OTP:", error);
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    } else {
      console.error("Non-Error object thrown:", error);
    }
    
    // Clean up on error
    if (recaptchaVerifier) {
      try {
        await recaptchaVerifier.clear();
      } catch (e) {
        console.log("Error clearing recaptcha on error:", e);
      }
      recaptchaVerifier = null;
    }
    
    // Provide more helpful error messages based on common Firebase errors
    if (errorMessage.includes("Firebase: Error (auth/invalid-phone-number)")) {
      return { 
        success: false, 
        error: "Invalid phone number format. Please enter a valid phone number with country code (e.g., +91XXXXXXXXXX)." 
      };
    } else if (errorMessage.includes("Firebase: Error (auth/captcha-check-failed)")) {
      return { 
        success: false, 
        error: "reCAPTCHA validation failed. Please refresh and try again." 
      };
    } else if (errorMessage.includes("Firebase: Error (auth/quota-exceeded)")) {
      return { 
        success: false, 
        error: "SMS quota exceeded. Please try again later or contact support." 
      };
    } else if (errorMessage.includes("Firebase: Error (auth/")) {
      return { 
        success: false, 
        error: "Firebase authentication error. Please check your phone number and try again." 
      };
    } else {
      return { 
        success: false, 
        error: "Could not send verification code. Please try again or contact support." 
      };
    }
  }
};

/**
 * Verifies the OTP entered by the user
 * @param confirmationResult The confirmation result returned from sendOTP
 * @param otp The OTP entered by the user
 * @returns Object with success flag and user or error message
 */
export const verifyOTP = async (
  confirmationResult: ConfirmationResult,
  otp: string
): Promise<{ success: boolean; user?: any; error?: string }> => {
  try {
    console.log("Attempting to verify OTP:", { 
      otpLength: otp.length, 
      hasConfirmationResult: !!confirmationResult 
    });
    
    // Additional validation
    if (otp.length !== 6) {
      console.error("Invalid OTP length:", otp.length);
      return {
        success: false,
        error: "Verification code must be 6 digits."
      };
    }
    
    if (!confirmationResult) {
      console.error("Missing confirmation result for OTP verification");
      return {
        success: false,
        error: "Missing verification session. Please request a new code."
      };
    }
    
    console.log("Submitting OTP verification...");
    const result = await confirmationResult.confirm(otp);
    
    console.log("OTP verification successful:", { uid: result.user?.uid ? "present" : "missing" });
    return { success: true, user: result.user };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error verifying OTP:", error);
    console.error("Verification error details:", {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : "No stack trace",
      name: error instanceof Error ? error.name : "Unknown error type"
    });
    
    // Provide more specific error messages based on common Firebase errors
    if (errorMessage.includes("auth/invalid-verification-code")) {
      return { 
        success: false, 
        error: "The verification code is incorrect. Please check and try again." 
      };
    } else if (errorMessage.includes("auth/code-expired")) {
      return {
        success: false,
        error: "The verification code has expired. Please request a new code."
      };
    } else if (errorMessage.includes("auth/missing-verification-code")) {
      return {
        success: false,
        error: "Please enter the verification code sent to your phone."
      };
    } else {
      return { 
        success: false, 
        error: "Verification failed. Please try again or request a new code." 
      };
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