import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { sendOTP, verifyOTP, clearRecaptcha } from "@/lib/firebase";
import { RotateCw, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";

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
  const [step, setStep] = useState<"send" | "verify">("send");
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formattedPhone, setFormattedPhone] = useState(phone);
  
  // For invisible reCAPTCHA
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  
  // Initialize phone number format and cleanup
  useEffect(() => {
    let formatted = phone || "";
    
    // Add +91 prefix if needed
    if (!formatted.startsWith("+")) {
      formatted = `+91${formatted.replace(/^0+/, '')}`;
    }
    
    setFormattedPhone(formatted);
    console.log("Formatted phone number:", formatted);
    
    // Cleanup on unmount
    return () => {
      clearRecaptcha();
    };
  }, [phone]);

  const handleSendOTP = async () => {
    setLoading(true);
    setErrorMessage(null);
    
    try {
      console.log("Attempting to send OTP to:", formattedPhone);
      
      // Create recaptcha container if it doesn't exist
      if (!document.getElementById('recaptcha-container')) {
        const container = document.createElement('div');
        container.id = 'recaptcha-container';
        container.style.display = 'none';
        document.body.appendChild(container);
      }
      
      const result = await sendOTP(formattedPhone, 'recaptcha-container');
      console.log("sendOTP result:", result);
      
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
          title: "SMS verification failed",
          description: result.error || "Failed to send verification code",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      setErrorMessage(errorMessage);
      toast({
        title: "Verification error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!confirmationResult) {
      setStep("send");
      toast({
        title: "Session expired",
        description: "Please request a new verification code",
        variant: "destructive",
      });
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
          description: "The code you entered is incorrect. Please check and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
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
    await clearRecaptcha();
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
            ? "Enter your phone number to receive verification code" 
            : "Enter the verification code sent to your phone"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "send" ? (
          <div className="space-y-4">
            <div className="relative">
              <Input
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
            
            {errorMessage && (
              <div className="text-sm bg-destructive/10 text-destructive p-3 rounded-md border border-destructive/20 mt-2">
                <p>{errorMessage}</p>
              </div>
            )}
            
            {/* Hidden recaptcha container */}
            <div id="recaptcha-container" ref={recaptchaContainerRef} className="hidden"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border-2 border-primary/20 bg-primary/5 rounded-md p-4 mb-3">
              <p className="text-sm mb-1">Verification code sent to:</p>
              <p className="font-medium">{formattedPhone}</p>
            </div>
            
            <Input
              value={otp}
              onChange={(e) => {
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
            
            {errorMessage && (
              <div className="text-sm bg-destructive/10 text-destructive p-3 rounded-md border border-destructive/20 mt-2">
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
            className="w-full"
          >
            {loading ? <RotateCw className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            Send Verification Code
          </Button>
        ) : (
          <div className="flex w-full flex-col sm:flex-row gap-2">
            <Button 
              variant="outline"
              onClick={handleResendOTP}
              disabled={loading}
              className="w-full"
            >
              <RotateCw className="mr-2 h-4 w-4" />
              Resend Code
            </Button>
            <Button 
              onClick={handleVerifyOTP}
              disabled={otp.length !== 6 || loading}
              className="w-full"
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