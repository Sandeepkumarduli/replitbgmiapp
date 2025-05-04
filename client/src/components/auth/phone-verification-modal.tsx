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
            <Alert variant="destructive" className="bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="font-bold">Security Notice</AlertTitle>
              <AlertDescription>
                Phone verification is mandatory for your account security. You cannot access tournament features without completing this verification.
              </AlertDescription>
            </Alert>
            
            <PhoneVerification
              phone={user.phone || ""}
              userId={user.id}
              onSuccess={handleVerificationSuccess}
            />
            
            <div className="mt-4 text-sm text-foreground/80 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
              <h4 className="font-semibold flex items-center gap-2 mb-3">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>Verification Guide</span>
              </h4>
              
              <div className="relative">
                <div className="absolute left-[9px] top-7 bottom-2 w-[2px] bg-slate-200 dark:bg-slate-700"></div>
                <ol className="list-none pl-0 space-y-6 relative">
                  <li className="pl-7 relative">
                    <div className="absolute left-0 top-0 flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-xs font-bold">1</div>
                    <p className="font-medium">Enter your phone number with country code</p>
                    <p className="text-xs text-muted-foreground mt-1">Format: +91XXXXXXXXXX (include the + sign)</p>
                  </li>
                  <li className="pl-7 relative">
                    <div className="absolute left-0 top-0 flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-xs font-bold">2</div>
                    <p className="font-medium">Complete the reCAPTCHA challenge</p>
                    <p className="text-xs text-muted-foreground mt-1">Verify you're human by clicking the checkbox</p>
                  </li>
                  <li className="pl-7 relative">
                    <div className="absolute left-0 top-0 flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-xs font-bold">3</div>
                    <p className="font-medium">Request the verification code</p>
                    <p className="text-xs text-muted-foreground mt-1">Click "Send Verification Code" to get your SMS</p>
                  </li>
                  <li className="pl-7 relative">
                    <div className="absolute left-0 top-0 flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-xs font-bold">4</div>
                    <p className="font-medium">Enter the 6-digit code from the SMS</p>
                    <p className="text-xs text-muted-foreground mt-1">The SMS should arrive within 1 minute</p>
                  </li>
                  <li className="pl-7 relative">
                    <div className="absolute left-0 top-0 flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-xs font-bold">5</div>
                    <p className="font-medium">Complete verification</p>
                    <p className="text-xs text-muted-foreground mt-1">Click "Verify" to access your account</p>
                  </li>
                </ol>
              </div>
              
              <div className="mt-6 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 p-3 rounded-md">
                <p className="font-semibold mb-2">Having trouble receiving the code?</p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Check that your phone number is entered correctly with country code</li>
                  <li>Make sure your mobile device has signal and can receive SMS</li>
                  <li>Try disabling any SMS blocking apps or features on your phone</li>
                  <li>If nothing works, try refreshing the page and starting over</li>
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