import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import PhoneVerification from "./phone-verification";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { ShieldCheck } from "lucide-react";

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
    // Always set to false - we've removed phone verification requirement
    setShouldShow(false);
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
            For security reasons, you must verify your phone number to continue.
          </DialogDescription>
        </DialogHeader>
        
        {user && (
          <PhoneVerification
            phone={user.phone || ""}
            userId={user.id}
            onSuccess={handleVerificationSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PhoneVerificationModal;