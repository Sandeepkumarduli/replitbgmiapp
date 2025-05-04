import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import PhoneVerification from "./phone-verification";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { ShieldCheck, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PhoneVerificationModalProps {
  open: boolean;
  onClose: () => void;
}

const PhoneVerificationModal: React.FC<PhoneVerificationModalProps> = ({
  open,
  onClose,
}) => {
  const { user } = useAuth();
  const [shouldShow, setShouldShow] = useState(false);
  
  // Check phone verification status
  const { data, refetch } = useQuery<{ phoneVerified: boolean; phone: string }>({
    queryKey: ["/api/auth/phone-verification-status"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user && open,
  });
  
  useEffect(() => {
    if (user && open) {
      // If user exists, phone exists, but not verified, show modal
      setShouldShow(!data?.phoneVerified && !!user?.phone);
    } else {
      setShouldShow(false);
    }
  }, [user, data, open]);
  
  const handleVerificationSuccess = () => {
    refetch();
    setShouldShow(false);
    onClose();
  };

  useEffect(() => {
    if (user) {
      console.log("Phone verification modal - User data:", {
        id: user.id,
        phone: user.phone,
        phoneVerified: user.phoneVerified
      });
    }
    
    if (data) {
      console.log("Phone verification status from API:", data);
    }
  }, [user, data]);

  return (
    <Dialog 
      open={shouldShow} 
      onOpenChange={(open) => {
        // Don't allow closing this dialog by clicking outside
        // Only verification will close it
        if (!open && !data?.phoneVerified) {
          return;
        }
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <ShieldCheck className="mr-2 h-5 w-5 text-primary" />
            Phone Verification Required
          </DialogTitle>
          <DialogDescription>
            For security reasons, you must verify your phone number to continue using the platform.
          </DialogDescription>
        </DialogHeader>
        
        {user && (
          <div className="space-y-6">
            <Alert variant="destructive" className="bg-red-50 text-red-800 border-red-300">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Verification Required</AlertTitle>
              <AlertDescription>
                Phone verification is mandatory for security reasons. You cannot access your account without completing verification.
              </AlertDescription>
            </Alert>
            
            <PhoneVerification
              phone={user.phone || ""}
              userId={user.id}
              onSuccess={handleVerificationSuccess}
            />
            
            <div className="mt-4 text-sm text-foreground/80 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
              <h4 className="font-semibold mb-2">Phone Verification Instructions:</h4>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Enter your phone number with country code (e.g., +91XXXXXXXXXX)</li>
                <li>Complete the reCAPTCHA verification</li>
                <li>Click "Send Verification Code" to receive an SMS</li>
                <li>Enter the 6-digit code received in the SMS</li>
                <li>Click "Verify" to complete the process</li>
              </ol>
              
              <div className="mt-4 text-xs text-muted-foreground">
                <p className="font-medium">Having trouble?</p>
                <ul className="list-disc pl-5 mt-1">
                  <li>Make sure you entered the correct phone number with country code</li>
                  <li>Check that you have a stable internet connection</li>
                  <li>Complete the reCAPTCHA verification correctly</li>
                  <li>Wait a few moments for the SMS to arrive (it may take up to 1 minute)</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PhoneVerificationModal;