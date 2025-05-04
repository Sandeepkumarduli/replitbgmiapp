import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PhoneVerification } from "@/components/auth/phone-verification";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

/**
 * A modal component that checks if the user needs to verify their phone number
 * and displays the phone verification UI if needed
 */
export function PhoneVerificationCheck() {
  const { user, isAuthenticated } = useAuth();
  const [showVerification, setShowVerification] = useState(false);

  // Check if phone verification is required (only if user is authenticated)
  const { data: verificationStatus } = useQuery({
    queryKey: ["/api/auth/phone-verification-status"],
    enabled: !!isAuthenticated,
  });

  useEffect(() => {
    // If user is authenticated and has a phone number not yet verified
    if (isAuthenticated && user && verificationStatus) {
      const needsVerification = user.phoneVerified === false || 
        (verificationStatus && verificationStatus.phoneVerified === false);
        
      setShowVerification(needsVerification);
    }
  }, [isAuthenticated, user, verificationStatus]);

  // Handle verification completion
  const handleVerificationComplete = () => {
    setShowVerification(false);
  };

  // Temporary placeholder for cancel - in real implementation, we may want to restrict
  // access to app features until verification is complete
  const handleCancel = () => {
    setShowVerification(false);
  };

  if (!user || !isAuthenticated) {
    return null;
  }

  return (
    <Dialog open={showVerification} onOpenChange={setShowVerification}>
      <DialogContent className="sm:max-w-md bg-dark-card border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Phone Verification Required</DialogTitle>
          <DialogDescription className="text-gray-400">
            For security purposes, we need to verify your phone number before you can access all features.
          </DialogDescription>
        </DialogHeader>
        
        <PhoneVerification
          phoneNumber={user.phone}
          userId={user.id}
          onVerificationComplete={handleVerificationComplete}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
}