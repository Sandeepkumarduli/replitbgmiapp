import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import PhoneVerification from "./phone-verification";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

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
    <Dialog open={shouldShow} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Phone Verification Required</DialogTitle>
          <DialogDescription>
            For security reasons, please verify your phone number to continue using the platform.
          </DialogDescription>
        </DialogHeader>
        
        {user && (
          <div>
            <PhoneVerification
              phone={user.phone || ""}
              userId={user.id}
              onSuccess={handleVerificationSuccess}
              onCancel={onClose}
            />
            <div className="mt-4 text-xs text-muted-foreground">
              Having trouble? Make sure you:
              <ul className="list-disc pl-5 mt-1">
                <li>Enter your phone number with country code (e.g., +91XXXXXXXXXX)</li>
                <li>Have a stable internet connection</li>
                <li>Complete the reCAPTCHA verification</li>
              </ul>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PhoneVerificationModal;