import { useState, useRef, useEffect } from "react";
import { sendOTP, verifyOTP, clearRecaptcha } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface PhoneVerificationProps {
  phoneNumber: string;
  userId: number;
  onVerificationComplete: () => void;
  onCancel: () => void;
}

export function PhoneVerification({
  phoneNumber,
  userId,
  onVerificationComplete,
  onCancel,
}: PhoneVerificationProps) {
  const [step, setStep] = useState<"sendOTP" | "verifyOTP">("sendOTP");
  const [isLoading, setIsLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [error, setError] = useState("");
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Clean up on unmount
    return () => {
      clearRecaptcha();
    };
  }, []);

  const handleSendOTP = async () => {
    setIsLoading(true);
    setError("");

    try {
      if (!recaptchaContainerRef.current) {
        throw new Error("reCAPTCHA container not ready");
      }

      // Format phone number to E.164 format if it doesn't already have country code
      let formattedPhone = phoneNumber;
      if (!phoneNumber.startsWith("+")) {
        formattedPhone = "+91" + phoneNumber.replace(/^0/, "");
      }

      const result = await sendOTP(
        formattedPhone,
        "recaptcha-container"
      );

      if (result.success) {
        setConfirmationResult(result.confirmationResult);
        setStep("verifyOTP");
        toast({
          title: "OTP Sent",
          description: "A verification code has been sent to your phone.",
        });
      } else {
        setError(result.error || "Failed to send OTP. Please try again.");
        toast({
          title: "Error",
          description: result.error || "Failed to send OTP. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length < 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await verifyOTP(confirmationResult, otp);

      if (result.success) {
        // Call API to update user's verification status
        const response = await fetch("/api/auth/verify-phone", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            firebaseUid: result.user.uid,
            phoneNumber,
          }),
        });

        if (response.ok) {
          toast({
            title: "Phone Verified",
            description: "Your phone number has been successfully verified.",
          });
          onVerificationComplete();
        } else {
          const data = await response.json();
          throw new Error(data.message || "Failed to confirm verification");
        }
      } else {
        setError(result.error || "Invalid OTP. Please try again.");
        toast({
          title: "Verification Failed",
          description: result.error || "Invalid OTP. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-dark-card border-gray-700">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-white">
          Phone Verification
        </CardTitle>
        <CardDescription className="text-gray-400">
          Verify your phone number to secure your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "sendOTP" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-gray-300">
                Phone Number
              </Label>
              <div className="flex items-center space-x-3">
                <Input
                  id="phone"
                  value={phoneNumber}
                  disabled
                  className="bg-dark-input text-white border-gray-700"
                />
              </div>
            </div>

            <div id="recaptcha-container" ref={recaptchaContainerRef} className="mt-4"></div>

            {error && (
              <div className="text-red-500 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {step === "verifyOTP" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp" className="text-gray-300">
                Enter OTP
              </Label>
              <Input
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                maxLength={6}
                placeholder="6-digit code"
                className="bg-dark-input text-white border-gray-700"
              />
              <p className="text-sm text-gray-400">
                A 6-digit code has been sent to your phone.
              </p>
            </div>

            {error && (
              <div className="text-red-500 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="border-gray-700 text-gray-300 hover:bg-gray-800"
        >
          Cancel
        </Button>

        {step === "sendOTP" ? (
          <Button
            onClick={handleSendOTP}
            disabled={isLoading}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send OTP"
            )}
          </Button>
        ) : (
          <Button
            onClick={handleVerifyOTP}
            disabled={isLoading || otp.length < 6}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify OTP"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}