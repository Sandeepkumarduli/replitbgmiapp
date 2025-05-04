import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import PhoneVerificationModal from "./phone-verification-modal";

export function PhoneVerificationCheck() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  
  // Check if phone verification is required
  const { data } = useQuery<{ phoneVerified: boolean; phone: string }>({
    queryKey: ["/api/auth/phone-verification-status"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
    refetchOnWindowFocus: true,
    refetchInterval: 60000, // Refetch every minute
  });
  
  useEffect(() => {
    // If user exists and has a phone, but it's not verified, show the modal
    if (user && !data?.phoneVerified) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [user, data]);
  
  // Close handler (we might not actually close if verification is required)
  const handleClose = () => {
    // Only allow closing if already verified
    if (data?.phoneVerified) {
      setIsOpen(false);
    }
  };
  
  return <PhoneVerificationModal open={isOpen} onClose={handleClose} />;
}