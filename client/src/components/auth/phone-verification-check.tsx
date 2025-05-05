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
    // Phone verification is disabled as requested
    setIsOpen(false);
  }, [user, data]);
  
  // Close handler (always allows closing since verification is disabled)
  const handleClose = () => {
    // Always allow closing since verification is disabled
    setIsOpen(false);
  };
  
  return <PhoneVerificationModal open={isOpen} onClose={handleClose} />;
}