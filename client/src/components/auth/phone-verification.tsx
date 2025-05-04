import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { sendOTP, verifyOTP, clearRecaptcha } from "@/lib/firebase";
import { ConfirmationResult, RecaptchaVerifier, getAuth } from "firebase/auth";
import { RotateCw, ShieldCheck, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";

// Get auth instance for the reCAPTCHA reload button
const auth = getAuth();

interface PhoneVerificationProps {
  phone: string;
  userId: number;
  onSuccess?: () => void;
}

const PhoneVerification: React.FC<PhoneVerificationProps> = ({
  phone,
  userId,
  onSuccess
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [step, setStep] = useState<"send" | "verify">("send");
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formattedPhone, setFormattedPhone] = useState(phone);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  // Format phone number to E.164 format if needed
  useEffect(() => {
    // Cleanup recaptcha on component unmount
    return () => {
      clearRecaptcha();
    };
  }, []);
  
  // Initialize phone number format and clear any existing recaptcha
  useEffect(() => {
    // Always clear recaptcha when the component mounts or phone changes
    clearRecaptcha();
    
    let formatted = phone || "";
    
    // Strip any non-digit characters except the + sign
    formatted = formatted.replace(/[^\d+]/g, '');
    
    // If the phone doesn't start with +, add the country code
    if (!formatted && formatted !== "") {
      formatted = "+91"; // Default empty field to +91 prefix
    } else if (!formatted.startsWith("+")) {
      formatted = `+91${formatted.replace(/^0+/, '')}`; // Assuming Indian number by default, remove leading zeros
    }
    
    setFormattedPhone(formatted);
    console.log("Formatted phone number:", formatted);
  }, [phone]);

  const handleSendOTP = async () => {
    setLoading(true);
    setErrorMessage(null);
    
    try {
      console.log("Attempting to send OTP to:", formattedPhone);
      
      // Additional validation for phone number format
      if (!formattedPhone.match(/^\+[1-9]\d{1,14}$/)) {
        setErrorMessage("Phone number must be in international format with country code (e.g., +91XXXXXXXXXX)");
        toast({
          title: "Invalid phone number",
          description: "Please enter a valid phone number with country code starting with +",
          variant: "destructive",
        });
        return;
      }
      
      if (!recaptchaContainerRef.current) {
        console.error("reCAPTCHA container not found in DOM");
        throw new Error("reCAPTCHA container not found");
      }
      
      console.log("Preparing to send OTP with recaptcha container:", "recaptcha-container");
      const result = await sendOTP(formattedPhone, "recaptcha-container");
      console.log("sendOTP result:", result);
      
      if (result.success && result.confirmationResult) {
        console.log("OTP sent successfully, confirmation result received");
        setConfirmationResult(result.confirmationResult);
        setStep("verify");
        toast({
          title: "Verification code sent",
          description: `We've sent a verification code to ${formattedPhone}`,
        });
      } else {
        console.error("Failed to send OTP:", result.error);
        setErrorMessage(result.error || "Failed to send verification code");
        toast({
          title: "SMS verification failed",
          description: result.error || "Failed to send verification code. Please check your phone number format and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      console.error("Exception in handleSendOTP:", error);
      setErrorMessage(errorMessage);
      toast({
        title: "Verification error",
        description: "An error occurred while attempting to send the verification code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!confirmationResult) {
      setErrorMessage("Verification session expired. Please request a new code.");
      toast({
        title: "Session expired",
        description: "Please request a new verification code by clicking 'Resend Code'",
        variant: "destructive",
      });
      return;
    }
    
    // Validate OTP format
    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      setErrorMessage("Please enter a valid 6-digit verification code");
      return;
    }
    
    setLoading(true);
    setErrorMessage(null);
    
    try {
      console.log("Verifying OTP:", { otpLength: otp.length });
      const result = await verifyOTP(confirmationResult, otp);
      console.log("OTP verification result:", result);
      
      if (result.success && result.user) {
        console.log("OTP verification successful, sending data to server:", {
          userId,
          firebaseUid: result.user.uid,
          phoneNumber: formattedPhone
        });
        
        // Send verification result to server
        const serverResponse = await apiRequest("POST", "/api/auth/verify-phone", {
          userId: userId,
          firebaseUid: result.user.uid,
          phoneNumber: formattedPhone
        });
        
        console.log("Server verification response:", { 
          status: serverResponse.status,
          ok: serverResponse.ok
        });
        
        // Handle server response
        if (serverResponse.ok) {
          toast({
            title: "Phone verified",
            description: "Your phone number has been verified successfully",
          });
          onSuccess?.();
        } else {
          const errorData = await serverResponse.json();
          console.error("Server verification error:", errorData);
          throw new Error(errorData.message || "Failed to verify phone on server");
        }
      } else {
        console.error("Client-side verification failed:", result.error);
        setErrorMessage(result.error || "Failed to verify code");
        toast({
          title: "Verification failed",
          description: result.error || "The code you entered is incorrect. Please check and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      console.error("Exception in handleVerifyOTP:", error);
      setErrorMessage(errorMessage);
      toast({
        title: "Verification error",
        description: "There was a problem verifying your phone number. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleResendOTP = async () => {
    setStep("send");
    setOtp("");
    setConfirmationResult(null);
    clearRecaptcha();
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <ShieldCheck className="mr-2 h-5 w-5 text-primary" />
          Phone Verification
        </CardTitle>
        <CardDescription>
          {step === "send" 
            ? "Verify your phone number to secure your account" 
            : "Enter the verification code sent to your phone"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "send" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-base font-semibold">Phone Number</Label>
              <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 p-3 rounded-md text-sm">
                <p className="font-medium mb-1">Important:</p>
                <p>You must enter your phone number with the country code (e.g., +91XXXXXXXXXX) to receive the verification SMS.</p>
              </div>
              <div className="relative mt-2">
                <Input
                  id="phone"
                  value={formattedPhone}
                  onChange={(e) => setFormattedPhone(e.target.value)}
                  placeholder="+91XXXXXXXXXX"
                  disabled={loading}
                  className="pl-12 text-base"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <span className="font-mono">+91</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 mt-2">
                <p className="text-xs text-muted-foreground">
                  • Phone number must include country code (e.g., +91 for India)
                </p>
                <p className="text-xs text-muted-foreground">
                  • Do not include spaces or special characters
                </p>
                <p className="text-xs text-muted-foreground">
                  • This number will be used for account security only
                </p>
              </div>
              
              <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-semibold mb-2">Country Code Examples:</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p><span className="font-mono font-bold">+91</span> - India</p>
                    <p><span className="font-mono font-bold">+1</span> - USA/Canada</p>
                    <p><span className="font-mono font-bold">+44</span> - UK</p>
                    <p><span className="font-mono font-bold">+971</span> - UAE</p>
                  </div>
                  <div>
                    <p><span className="font-mono font-bold">+61</span> - Australia</p>
                    <p><span className="font-mono font-bold">+65</span> - Singapore</p>
                    <p><span className="font-mono font-bold">+966</span> - Saudi Arabia</p>
                    <p><span className="font-mono font-bold">+94</span> - Sri Lanka</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Format example: <span className="font-mono">+91XXXXXXXXXX</span> (no spaces)
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-950 rounded-md">
              <p className="text-sm font-medium mb-2">Complete the reCAPTCHA challenge below</p>
              <div 
                id="recaptcha-container" 
                ref={recaptchaContainerRef} 
                className="my-2 min-h-[80px] w-full flex justify-center items-center"
              >
                {/* reCAPTCHA will be rendered inside this container */}
                <div className="text-xs text-muted-foreground animate-pulse">
                  Loading reCAPTCHA...
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-3 space-y-1">
                <p className="font-medium">Not seeing the reCAPTCHA?</p>
                <ul className="list-disc pl-5">
                  <li>Make sure JavaScript is enabled</li>
                  <li>Check your internet connection</li>
                  <li>Disable any ad blockers temporarily</li>
                  <li>Try refreshing the page</li>
                </ul>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-xs mt-2 h-auto py-1"
                  onClick={() => {
                    console.log("Manual reCAPTCHA reload requested");
                    clearRecaptcha();
                    setTimeout(() => {
                      const container = document.getElementById('recaptcha-container');
                      if (container) {
                        container.innerHTML = '<div class="text-xs text-muted-foreground animate-pulse">Reloading reCAPTCHA...</div>';
                      }
                      
                      // Create a dummy RecaptchaVerifier as a fallback
                      try {
                        new RecaptchaVerifier(auth, 'recaptcha-container', {
                          size: "normal",
                          callback: () => console.log("reCAPTCHA callback triggered"),
                          "expired-callback": () => console.log("reCAPTCHA expired"),
                          "error-callback": (err: Error) => console.error("reCAPTCHA error:", err)
                        }).render();
                        console.log("Manual reCAPTCHA render initiated");
                      } catch (err: unknown) {
                        console.error("Failed to manually render reCAPTCHA:", err);
                        if (container) {
                          container.innerHTML = '<div class="text-xs text-red-500">Failed to load reCAPTCHA. Please refresh the page.</div>';
                        }
                      }
                    }, 500);
                  }}
                >
                  <RotateCw className="h-3 w-3 mr-1" />
                  Reload reCAPTCHA
                </Button>
              </div>
            </div>
            {errorMessage && (
              <div className="text-sm bg-destructive/10 text-destructive p-3 rounded-md border border-destructive/20 mt-2">
                <p className="font-medium mb-1">Error:</p>
                <p>{errorMessage}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp" className="text-base font-semibold">Verification Code</Label>
              <div className="border-2 border-primary/20 bg-primary/5 rounded-md p-4 mb-3">
                <p className="text-sm mb-2">A 6-digit verification code has been sent to:</p>
                <p className="font-medium">{formattedPhone}</p>
              </div>
              <Input
                id="otp"
                value={otp}
                onChange={(e) => {
                  // Only allow numeric input
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setOtp(value);
                }}
                placeholder="Enter 6-digit code"
                maxLength={6}
                autoComplete="one-time-code"
                inputMode="numeric"
                disabled={loading}
                className="text-lg tracking-widest text-center font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the 6-digit code sent to your phone. If you don't receive it within 1 minute, you can request a new code.
              </p>
            </div>
            {errorMessage && (
              <div className="text-sm bg-destructive/10 text-destructive p-3 rounded-md border border-destructive/20 mt-2">
                <p className="font-medium mb-1">Error:</p>
                <p>{errorMessage}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
        {step === "send" ? (
          <Button 
            onClick={handleSendOTP}
            disabled={!formattedPhone || loading}
            className="w-full sm:w-auto"
          >
            {loading ? <RotateCw className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            Send Verification Code
          </Button>
        ) : (
          <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2">
            <Button 
              variant="outline"
              onClick={handleResendOTP}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              <RotateCw className="mr-2 h-4 w-4" />
              Resend Code
            </Button>
            <Button 
              onClick={handleVerifyOTP}
              disabled={otp.length !== 6 || loading}
              className="w-full sm:w-auto"
            >
              {loading ? <RotateCw className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Verify
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default PhoneVerification;