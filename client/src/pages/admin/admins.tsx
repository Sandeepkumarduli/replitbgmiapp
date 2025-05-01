import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  MoreVertical,
  UserMinus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCheck,
  Info,
  AlertCircle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { User as UserType } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// For enhanced security, we'll use a system to log access
const logAdminAccess = async (action: string) => {
  try {
    await apiRequest("POST", "/api/admin/log", { action });
  } catch (error) {
    console.error("Failed to log admin access", error);
  }
};

export default function AdminManagement() {
  const { isAdmin, isAuthenticated, isLoading, user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<UserType | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSecurityAlert, setShowSecurityAlert] = useState(true);
  const [showSecurityDialog, setShowSecurityDialog] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      navigate("/auth");
    } else if (isAuthenticated && isAdmin) {
      // Log admin access to this sensitive page
      logAdminAccess("Accessed Admin Management Page");
    }
  }, [isAdmin, isAuthenticated, isLoading, navigate]);

  // Fetch admin users data
  const { data: adminUsers, isLoading: isLoadingAdmins } = useQuery<UserType[]>({
    queryKey: ["/api/admin/users/admins"],
    enabled: isAuthenticated && isAdmin,
  });

  // Remove admin privileges mutation
  const removeAdminMutation = useMutation({
    mutationFn: async (adminId: number) => {
      // Log this security-sensitive action
      await logAdminAccess(`Removed admin privileges from user ID: ${adminId}`);
      
      const response = await apiRequest("PATCH", `/api/admin/users/${adminId}/role`, { role: "user" });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/admins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      
      toast({
        title: "Admin privileges removed",
        description: "User has been demoted to regular user successfully",
      });
      setIsRemoveOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove admin privileges. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle remove admin
  const handleRemoveAdmin = (admin: UserType) => {
    // Prevent removing hardcoded admin or self
    if (admin.username === "Sandeepkumarduli" || admin.id === user?.id) {
      toast({
        title: "Action not allowed",
        description: admin.username === "Sandeepkumarduli" 
          ? "Cannot modify the system administrator account" 
          : "You cannot remove your own admin privileges",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedAdmin(admin);
    setIsRemoveOpen(true);
  };

  // Confirm remove admin
  const confirmRemoveAdmin = () => {
    if (selectedAdmin) {
      removeAdminMutation.mutate(selectedAdmin.id);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    
    try {
      await logAdminAccess("Refreshed Admins List");
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/users/admins"] });
      
      toast({
        title: "Refreshed",
        description: "Admin users list has been refreshed",
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Failed to refresh admin users",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Show security info
  const showSecurityInfo = () => {
    setShowSecurityDialog(true);
  };

  // Filter admins based on search term
  const filteredAdmins = adminUsers?.filter(admin => 
    admin.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    admin.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Administrators Management</h1>
          <p className="text-gray-400">Manage system administrators with enhanced security</p>
        </div>
        <div className="flex mt-4 md:mt-0">
          <Button 
            className="mr-2 bg-dark-surface hover:bg-dark-surface/90 text-white border border-gray-700"
            onClick={showSecurityInfo}
          >
            <Info className="mr-2 h-4 w-4 text-accent" />
            Security Info
          </Button>
          <Button 
            className="bg-primary hover:bg-primary/90 text-white"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Security Alert */}
      {showSecurityAlert && (
        <Alert className="bg-accent/10 border-accent mb-6 text-white">
          <ShieldAlert className="h-4 w-4 text-accent" />
          <AlertTitle className="text-white">Enhanced Security Zone</AlertTitle>
          <AlertDescription className="text-gray-300">
            This is a high-security management area. All actions are logged and monitored.
            The system administrator (Sandeepkumarduli) cannot be modified.
          </AlertDescription>
          <Button 
            variant="ghost" 
            className="text-accent hover:text-accent/90 hover:bg-transparent absolute top-2 right-2 h-8 w-8 p-0"
            onClick={() => setShowSecurityAlert(false)}
          >
            &times;
          </Button>
        </Alert>
      )}

      {/* Search and filter */}
      <Card className="bg-dark-card border-gray-800 mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search admins by username or email..."
              className="bg-dark-surface pl-10 border-gray-700 text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Admins Table */}
      <Card className="bg-dark-card border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-xl">System Administrators</CardTitle>
          <CardDescription className="text-gray-400">
            Showing {filteredAdmins?.length || 0} administrators with full system access
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAdmins ? (
            <div className="flex justify-center py-6">
              <RefreshCw className="h-6 w-6 text-primary animate-spin" />
            </div>
          ) : (
            <Table>
              <TableCaption>List of all system administrators</TableCaption>
              <TableHeader>
                <TableRow className="border-gray-800">
                  <TableHead className="text-gray-300">Username</TableHead>
                  <TableHead className="text-gray-300">Email</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">First Login</TableHead>
                  <TableHead className="text-gray-300 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdmins && filteredAdmins.length > 0 ? (
                  filteredAdmins.map((admin) => (
                    <TableRow key={admin.id} className="border-gray-800">
                      <TableCell className="font-medium text-white">
                        <div className="flex items-center">
                          {admin.username} 
                          {admin.username === "Sandeepkumarduli" && (
                            <Badge className="ml-2 bg-accent/20 text-accent hover:bg-accent/30">
                              <ShieldAlert className="h-3 w-3 mr-1" /> 
                              System Admin
                            </Badge>
                          )}
                          {admin.id === user?.id && (
                            <Badge className="ml-2 bg-primary/20 text-primary hover:bg-primary/30">
                              <UserCheck className="h-3 w-3 mr-1" /> 
                              You
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">{admin.email}</TableCell>
                      <TableCell>
                        <Badge className="bg-accent/20 text-accent hover:bg-accent/30">
                          <ShieldCheck className="h-3 w-3 mr-1" /> 
                          Administrator
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 text-gray-300 hover:bg-dark-surface">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-dark-card border-gray-800 text-white">
                            <DropdownMenuItem 
                              className="hover:bg-dark-surface cursor-pointer"
                              onClick={() => navigate(`/admin/users/${admin.id}`)}
                            >
                              <UserCheck className="mr-2 h-4 w-4 text-primary" />
                              View Details
                            </DropdownMenuItem>
                            
                            {/* Don't allow changing the hardcoded admin's role or current user */}
                            {admin.username !== "Sandeepkumarduli" && admin.id !== user?.id && (
                              <DropdownMenuItem 
                                className="hover:bg-dark-surface text-accent cursor-pointer"
                                onClick={() => handleRemoveAdmin(admin)}
                              >
                                <UserMinus className="mr-2 h-4 w-4" />
                                Remove Admin Privileges
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-400 py-6">
                      {searchTerm ? "No admins match your search" : "No administrators found"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter className="border-t border-gray-800 pt-6">
          <div className="flex w-full items-center justify-between">
            <p className="text-sm text-gray-400">
              <AlertCircle className="inline-block h-3.5 w-3.5 mr-1 text-accent" />
              Administrator actions are logged and monitored for security
            </p>
            <Button variant="outline" className="border-gray-700 text-white hover:bg-dark-surface" onClick={() => navigate('/admin/users')}>
              Go to Users Management
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Remove Admin Dialog */}
      <Dialog open={isRemoveOpen} onOpenChange={setIsRemoveOpen}>
        <DialogContent className="bg-dark-card border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Remove Administrator Privileges</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to remove administrator privileges from this user?
              They will be demoted to a regular user and lose access to all admin features.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-dark-surface rounded-md border border-gray-800 mb-4">
            <div className="flex items-center">
              <div className="bg-dark-card p-2 rounded-full">
                <ShieldCheck className="h-5 w-5 text-accent" />
              </div>
              <div className="ml-3">
                <p className="text-white font-medium">{selectedAdmin?.username}</p>
                <p className="text-gray-400 text-sm">{selectedAdmin?.email}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-gray-700 text-white hover:bg-dark-surface">
                Cancel
              </Button>
            </DialogClose>
            <Button 
              variant="destructive"
              onClick={confirmRemoveAdmin}
              disabled={removeAdminMutation.isPending}
            >
              <UserMinus className="mr-2 h-4 w-4" />
              {removeAdminMutation.isPending ? "Removing..." : "Remove Admin Privileges"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Security Info Dialog */}
      <AlertDialog open={showSecurityDialog} onOpenChange={setShowSecurityDialog}>
        <AlertDialogContent className="bg-dark-card border-gray-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Security Information</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This administrator management page implements several security measures:
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex">
                <ShieldCheck className="h-5 w-5 text-accent mr-2 flex-shrink-0" />
                <span>All admin actions are securely logged with timestamps and IP addresses</span>
              </li>
              <li className="flex">
                <ShieldAlert className="h-5 w-5 text-accent mr-2 flex-shrink-0" />
                <span>The system administrator account (Sandeepkumarduli) cannot be modified</span>
              </li>
              <li className="flex">
                <UserCheck className="h-5 w-5 text-primary mr-2 flex-shrink-0" />
                <span>Administrators cannot remove their own privileges</span>
              </li>
              <li className="flex">
                <Info className="h-5 w-5 text-accent mr-2 flex-shrink-0" />
                <span>Security events trigger immediate notifications to the system</span>
              </li>
            </ul>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-dark-surface hover:bg-dark-surface/90 text-white border border-gray-700">
              Close
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}