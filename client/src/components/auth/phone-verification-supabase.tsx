import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { sendOTP, verifyOTP, updateVerifiedPhone } from "@/lib/supabase-auth";
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formattedPhone, setFormattedPhone] = useState(phone);
  
  // Initialize phone number format
  useEffect(() => {
    let formatted = phone || "";
    
    // Add +91 prefix if needed
    if (!formatted.startsWith("+")) {
      formatted = `+91${formatted.replace(/^0+/, '')}`;
    }
    
    setFormattedPhone(formatted);
    console.log("Formatted phone number:", formatted);
  }, [phone]);

  const handleSendOTP = async () => {
    setLoading(true);
    setErrorMessage(null);
    
    try {
      console.log("Attempting to send OTP via Supabase to:", formattedPhone);
      
      const result = await sendOTP(formattedPhone);
      console.log("Supabase sendOTP result:", result);
      
      if (result.success) {
        setStep("verify");
        toast({
          title: "Verification code sent",
          description: `We've sent a verification code to ${formattedPhone}`,
        });
      } else {
        // For development, we'll provide a fallback
        if (process.env.NODE_ENV === 'development') {
          console.log("Using development fallback for OTP");
          setStep("verify");
          toast({
            title: "Development mode",
            description: "Use code 123456 for verification",
          });
        } else {
          setErrorMessage(result.error || "Failed to send verification code");
          toast({
            title: "SMS verification failed",
            description: result.error || "Failed to send verification code",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      setErrorMessage(errorMessage);
      
      // For development, we'll provide a fallback
      if (process.env.NODE_ENV === 'development') {
        console.log("Using development fallback for OTP after error");
        setStep("verify");
        toast({
          title: "Development mode",
          description: "Use code 123456 for verification",
        });
      } else {
        toast({
          title: "Verification error",
          description: "An error occurred. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setLoading(true);
    setErrorMessage(null);
    
    try {
      // For development, accept the hardcoded code
      if (process.env.NODE_ENV === 'development' && otp === '123456') {
        console.log("Using development verification bypass");
        
        // Update the user's phone verification status in the database
        const updateResult = await updateVerifiedPhone(userId, formattedPhone);
        
        if (updateResult.success) {
          toast({
            title: "Phone verified",
            description: "Your phone number has been verified successfully",
          });
          onSuccess?.();
        } else {
          throw new Error(updateResult.error || "Failed to update phone verification status");
        }
      } else {
        // Real verification with Supabase
        const result = await verifyOTP(formattedPhone, otp);
        
        if (result.success) {
          // Update the user's phone verification status in the database
          const updateResult = await updateVerifiedPhone(userId, formattedPhone);
          
          if (updateResult.success) {
            toast({
              title: "Phone verified",
              description: "Your phone number has been verified successfully",
            });
            onSuccess?.();
          } else {
            throw new Error(updateResult.error || "Failed to update phone verification status");
          }
        } else {
          setErrorMessage(result.error || "Failed to verify code");
          toast({
            title: "Verification failed",
            description: "The code you entered is incorrect. Please check and try again.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
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
    setErrorMessage(null);
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
            
            {/* Development helper message */}
            <div className="bg-amber-50 text-amber-800 p-3 rounded-md flex items-start">
              <p className="text-sm">
                <strong>Note:</strong> When using development mode, the verification code is always <strong>123456</strong>
              </p>
            </div>
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
            
            {/* Development helper message */}
            <div className="bg-amber-50 text-amber-800 p-3 rounded-md flex items-start">
              <p className="text-sm">
                <strong>Note:</strong> If using development mode, enter <strong>123456</strong> as the verification code
              </p>
            </div>
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