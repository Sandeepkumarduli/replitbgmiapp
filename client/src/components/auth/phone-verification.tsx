import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { sendOTP, verifyOTP, clearRecaptcha } from "@/lib/firebase";
import { ConfirmationResult } from "firebase/auth";
import { RotateCw, ShieldCheck, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";

interface PhoneVerificationProps {
  phone: string;
  userId: number;
  onSuccess?: () => void;
}

const PhoneVerification: React.FC<PhoneVerificationProps> = ({
  phone,
  userId,
  onSuccess,
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
      if (!recaptchaContainerRef.current) {
        throw new Error("reCAPTCHA container not found");
      }
      
      const result = await sendOTP(formattedPhone, "recaptcha-container");
      
      if (result.success && result.confirmationResult) {
        setConfirmationResult(result.confirmationResult);
        setStep("verify");
        toast({
          title: "Verification code sent",
          description: `We've sent a verification code to ${formattedPhone}`,
        });
      } else {
        setErrorMessage(result.error || "Failed to send verification code");
        toast({
          title: "Error",
          description: result.error || "Failed to send verification code",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      setErrorMessage(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!confirmationResult) {
      return;
    }
    
    setLoading(true);
    setErrorMessage(null);
    
    try {
      const result = await verifyOTP(confirmationResult, otp);
      
      if (result.success && result.user) {
        // Send verification result to server
        const serverResponse = await apiRequest("POST", "/api/auth/verify-phone", {
          userId: userId,
          firebaseUid: result.user.uid,
          phoneNumber: formattedPhone
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
          throw new Error(errorData.message || "Failed to verify phone on server");
        }
      } else {
        setErrorMessage(result.error || "Failed to verify code");
        toast({
          title: "Verification failed",
          description: result.error || "Failed to verify code",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      setErrorMessage(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
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
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formattedPhone}
                onChange={(e) => setFormattedPhone(e.target.value)}
                placeholder="+91XXXXXXXXXX"
                disabled={loading}
                className="mb-2"
              />
              <p className="text-xs text-muted-foreground">
                Please ensure your phone number is in the correct format with country code
              </p>
            </div>
            <div className="flex flex-col items-center border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-950 rounded-md">
              <p className="text-sm font-medium mb-2">Complete the reCAPTCHA to continue</p>
              <div id="recaptcha-container" ref={recaptchaContainerRef} className="my-2 min-h-[80px] w-full flex justify-center"></div>
              <p className="text-xs text-muted-foreground mt-1 text-center">
                If you don't see the reCAPTCHA, please refresh the page
              </p>
            </div>
            {errorMessage && (
              <div className="text-sm text-destructive mt-2">{errorMessage}</div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <Input
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                autoComplete="one-time-code"
                inputMode="numeric"
                disabled={loading}
              />
            </div>
            {errorMessage && (
              <div className="text-sm text-destructive mt-2">{errorMessage}</div>
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