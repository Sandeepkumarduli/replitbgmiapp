import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { sendOTP, verifyOTP } from "@/lib/supabase-auth";
import { RotateCw, ShieldCheck, Phone } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";

const OtpLogin: React.FC = () => {
  const { toast } = useToast();
  const { refreshUser } = useAuth();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const handleSendOtp = async () => {
    setLoading(true);
    setErrorMessage(null);
    
    try {
      // Format phone number
      let formattedPhone = phone;
      if (!formattedPhone.startsWith("+")) {
        formattedPhone = `+91${formattedPhone.replace(/^0+/, '')}`;
      }
      
      // Send OTP via Supabase
      const result = await sendOTP(formattedPhone);
      
      if (result.success) {
        setStep("otp");
        toast({
          title: "Verification code sent",
          description: `We've sent a verification code to ${formattedPhone}`,
        });
      } else {
        // Check if it's a development mode message
        if (result.error?.includes('Development mode')) {
          toast({
            title: "Development Mode",
            description: "OTP functionality is disabled in development mode. Please setup Supabase credentials.",
            variant: "default",
          });
          
          // For development, allow moving to OTP step without real verification
          if (import.meta.env.DEV) {
            console.warn("DEV MODE: Allowing OTP step without real verification");
            setStep("otp");
          }
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
      
      toast({
        title: "Verification error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleVerifyOtp = async () => {
    setLoading(true);
    setErrorMessage(null);
    
    try {
      // Format phone number
      let formattedPhone = phone;
      if (!formattedPhone.startsWith("+")) {
        formattedPhone = `+91${formattedPhone.replace(/^0+/, '')}`;
      }
      
      // Verify OTP via Supabase
      const result = await verifyOTP(formattedPhone, otp);
      
      if (result.success) {
        // Now login with the phone and OTP
        const loginResult = await apiRequest("POST", "/api/auth/phone-login", {
          phone: formattedPhone,
          otp
        });
        
        if (loginResult.ok) {
          const userData = await loginResult.json();
          toast({
            title: "Login successful",
            description: `Welcome back, ${userData.username}!`,
          });
          
          // Refresh the user data in the auth context
          refreshUser();
          
          // Redirect to home page
          window.location.href = "/";
        } else {
          const errorData = await loginResult.json();
          throw new Error(errorData.message || "Login failed");
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
      console.error("Error verifying OTP:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      setErrorMessage(errorMessage);
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleResendOtp = () => {
    setStep("phone");
    setOtp("");
    setErrorMessage(null);
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Phone className="mr-2 h-5 w-5 text-primary" />
          Phone Number Login
        </CardTitle>
        <CardDescription>
          {step === "phone" 
            ? "Enter your phone number to receive a login code" 
            : "Enter the verification code sent to your phone"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "phone" ? (
          <div className="space-y-4">
            <div className="relative">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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
            
            <div className="bg-blue-50 text-blue-800 p-3 rounded-md flex items-start">
              <p className="text-sm">
                <strong>Note:</strong> You must use the same phone number that you registered with.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border-2 border-primary/20 bg-primary/5 rounded-md p-4 mb-3">
              <p className="text-sm mb-1">Verification code sent to:</p>
              <p className="font-medium">{phone}</p>
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
        {step === "phone" ? (
          <Button 
            onClick={handleSendOtp}
            disabled={!phone || loading}
            className="w-full"
          >
            {loading ? <RotateCw className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            Send Verification Code
          </Button>
        ) : (
          <div className="flex w-full flex-col sm:flex-row gap-2">
            <Button 
              variant="outline"
              onClick={handleResendOtp}
              disabled={loading}
              className="w-full"
            >
              <RotateCw className="mr-2 h-4 w-4" />
              Resend Code
            </Button>
            <Button 
              onClick={handleVerifyOtp}
              disabled={otp.length !== 6 || loading}
              className="w-full"
            >
              {loading ? <RotateCw className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Login
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default OtpLogin;