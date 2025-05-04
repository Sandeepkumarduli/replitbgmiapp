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
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Clock } from "lucide-react";

interface PhoneVerificationModalProps {
  open: boolean;
  onClose: () => void;
}

const PhoneVerificationModal: React.FC<PhoneVerificationModalProps> = ({
  open,
  onClose,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [shouldShow, setShouldShow] = useState(false);
  const [verificationTab, setVerificationTab] = useState<"sms" | "bypass">("sms");
  const [bypassReason, setBypassReason] = useState("");
  const [isSubmittingBypass, setIsSubmittingBypass] = useState(false);
  
  // Check phone verification status
  const { data, refetch } = useQuery<{ phoneVerified: boolean; phone: string }>({
    queryKey: ["/api/auth/phone-verification-status"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user && open,
  });
  
  // Bypass verification mutation
  const bypassMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/bypass-phone-verification", {
        userId: user?.id,
        reason: bypassReason
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/phone-verification-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Verification postponed",
        description: "You can continue using the platform. We recommend verifying your phone later for better security.",
      });
      handleVerificationSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred while processing your request",
        variant: "destructive",
      });
    }
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
  
  const handleBypassRequest = async () => {
    if (!bypassReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for skipping verification",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmittingBypass(true);
    try {
      console.log("Sending bypass request with reason:", bypassReason);
      
      // Call the real API endpoint
      await bypassMutation.mutateAsync();
      
      console.log("Bypass request successful");
    } catch (error) {
      console.error("Bypass request error:", error);
      toast({
        title: "Error",
        description: "Failed to process your request. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingBypass(false);
    }
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
          <DialogTitle>Phone Verification</DialogTitle>
          <DialogDescription>
            For security reasons, please verify your phone number to continue using the platform.
          </DialogDescription>
        </DialogHeader>
        
        {user && (
          <Tabs defaultValue="sms" value={verificationTab} onValueChange={(v) => setVerificationTab(v as "sms" | "bypass")}>
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="sms" className="flex items-center">
                <ShieldCheck className="mr-2 h-4 w-4" />
                SMS Verification
              </TabsTrigger>
              <TabsTrigger value="bypass" className="flex items-center">
                <Clock className="mr-2 h-4 w-4" />
                Continue Without Verification
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="sms" className="pt-4">
              <PhoneVerification
                phone={user.phone || ""}
                userId={user.id}
                onSuccess={handleVerificationSuccess}
                onCancel={() => setVerificationTab("bypass")}
              />
              <div className="mt-4 text-xs text-muted-foreground">
                Having trouble? Make sure you:
                <ul className="list-disc pl-5 mt-1">
                  <li>Enter your phone number with country code (e.g., +91XXXXXXXXXX)</li>
                  <li>Have a stable internet connection</li>
                  <li>Complete the reCAPTCHA verification</li>
                </ul>
              </div>
            </TabsContent>
            
            <TabsContent value="bypass" className="pt-4">
              <div className="space-y-4">
                <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-md text-sm text-amber-800 dark:text-amber-300">
                  <p className="font-medium">Why verify your phone?</p>
                  <p className="mt-1">Phone verification helps secure your account and enables important notifications about tournaments and team activities.</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bypass-reason">Please tell us why you can't verify your phone now</Label>
                  <Input
                    id="bypass-reason"
                    value={bypassReason}
                    onChange={(e) => setBypassReason(e.target.value)}
                    placeholder="e.g., Not receiving SMS, Having technical issues, etc."
                    disabled={isSubmittingBypass}
                  />
                </div>
                
                <DialogFooter className="flex flex-col sm:flex-row gap-2 justify-between">
                  <Button 
                    variant="outline" 
                    onClick={() => setVerificationTab("sms")}
                    disabled={isSubmittingBypass}
                    className="w-full sm:w-auto"
                  >
                    Back to SMS Verification
                  </Button>
                  <Button 
                    onClick={handleBypassRequest} 
                    disabled={!bypassReason.trim() || isSubmittingBypass}
                    className="w-full sm:w-auto"
                  >
                    Continue Without Verification
                  </Button>
                </DialogFooter>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PhoneVerificationModal;