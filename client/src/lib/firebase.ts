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

    // Clear any existing recaptcha
    if (recaptchaVerifier) {
      await recaptchaVerifier.clear();
      recaptchaVerifier = null;
    }

    // Create new reCAPTCHA verifier
    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: "normal",
      callback: () => {
        // reCAPTCHA solved, allow signInWithPhoneNumber.
      },
      "expired-callback": () => {
        // Response expired. Ask user to solve reCAPTCHA again.
        throw new Error("reCAPTCHA expired. Please refresh and try again.");
      },
    });

    // Render the reCAPTCHA
    await recaptchaVerifier.render();

    // Send verification code
    const confirmationResult = await signInWithPhoneNumber(
      auth,
      phoneNumber,
      recaptchaVerifier
    );

    return { success: true, confirmationResult };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending OTP:", errorMessage);
    
    // Clean up on error
    if (recaptchaVerifier) {
      await recaptchaVerifier.clear();
      recaptchaVerifier = null;
    }
    
    return { 
      success: false, 
      error: errorMessage.includes("Firebase") 
        ? "Could not send verification code. Please check your phone number and try again."
        : errorMessage
    };
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
    const result = await confirmationResult.confirm(otp);
    return { success: true, user: result.user };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error verifying OTP:", errorMessage);
    return { 
      success: false, 
      error: errorMessage.includes("auth/invalid-verification-code") 
        ? "Invalid verification code. Please try again." 
        : "Verification failed. Please try again."
    };
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