import { initializeApp } from "firebase/app";
import { getAuth, PhoneAuthProvider, signInWithPhoneNumber, RecaptchaVerifier } from "firebase/auth";

// Initialize Firebase with environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: "832946555126", // From your Firebase config
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Phone authentication functions
let recaptchaVerifier: RecaptchaVerifier | null = null;

/**
 * Initialize the reCAPTCHA verifier
 * @param containerId DOM element ID where the reCAPTCHA should be rendered
 */
export function initializeRecaptcha(containerId: string) {
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: "normal",
      callback: () => {
        // reCAPTCHA solved, allow sending OTP
      },
      "expired-callback": () => {
        // Reset reCAPTCHA
        recaptchaVerifier = null;
      }
    });
  }

  return recaptchaVerifier;
}

/**
 * Send OTP to the provided phone number
 * @param phoneNumber Phone number in E.164 format (e.g., +919876543210)
 * @param recaptchaContainer DOM element ID where reCAPTCHA should be rendered
 * @returns confirmationResult object to use for code verification
 */
export async function sendOTP(phoneNumber: string, recaptchaContainer: string) {
  try {
    const verifier = initializeRecaptcha(recaptchaContainer);
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, verifier);
    return { success: true, confirmationResult };
  } catch (error) {
    console.error("Error sending OTP:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error sending OTP" 
    };
  }
}

/**
 * Verify the OTP code entered by the user
 * @param confirmationResult The confirmationResult from sendOTP function
 * @param code The OTP code entered by user
 * @returns Object containing verification result
 */
export async function verifyOTP(confirmationResult: any, code: string) {
  try {
    const result = await confirmationResult.confirm(code);
    const user = result.user;
    
    // Return the Firebase user object and token
    const token = await user.getIdToken();
    return { 
      success: true, 
      user: {
        uid: user.uid,
        phoneNumber: user.phoneNumber,
      },
      token 
    };
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Invalid verification code" 
    };
  }
}

/**
 * Clear reCAPTCHA when no longer needed
 */
export function clearRecaptcha() {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
  }
}

export { auth };