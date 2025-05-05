import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AdminLayout from "@/components/layouts/admin-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MoreVertical, Shield, RefreshCw, UserPlus, Trash } from "lucide-react";
import { format } from "date-fns";

export default function AdminAdministrators() {
  const { isAdmin, isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    username: "",
    email: "",
    password: "",
    phone: ""
  });

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      navigate("/auth");
    }
  }, [isAdmin, isAuthenticated, isLoading, navigate]);

  const { data: administrators = [], isLoading: isAdminsLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/administrators"],
    select: (data) => Array.isArray(data) ? data : []
  });

  const refreshAdmins = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({
        title: "Administrators list refreshed",
        description: "The administrators list has been refreshed successfully"
      });
    } catch (error) {
      toast({
        title: "Failed to refresh administrators",
        description: "There was an error refreshing the administrators list",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const addAdminMutation = useMutation({
    mutationFn: async (userData: any) => {
      const res = await apiRequest("POST", "/api/admin/users", userData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/administrators"] });
      setIsAddAdminOpen(false);
      setNewAdmin({ username: "", email: "", password: "", phone: "" });
      toast({
        title: "Administrator added",
        description: "The new administrator has been added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add administrator",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const revokeAdminMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("PATCH", `/api/admin/administrators/${userId}/revoke`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/administrators"] });
      toast({
        title: "Admin privileges revoked",
        description: "The administrator privileges have been revoked successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to revoke admin privileges",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddAdmin = () => {
    if (!newAdmin.username || !newAdmin.email || !newAdmin.password) {
      toast({
        title: "Missing information",
        description: "Please provide all required fields",
        variant: "destructive",
      });
      return;
    }

    addAdminMutation.mutate({
      ...newAdmin,
      role: "admin",
    });
  };

  const handleRevokeAdmin = (adminId: number, adminUsername: string) => {
    // Don't allow revoking the master admin account
    if (adminUsername === "Sandeepkumarduli") {
      toast({
        title: "Action not allowed",
        description: "Cannot modify the system administrator account",
        variant: "destructive",
      });
      return;
    }

    if (confirm(`Are you sure you want to revoke admin privileges for ${adminUsername}?`)) {
      revokeAdminMutation.mutate(adminId);
    }
  };

  if (isLoading || isAdminsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Administrators</h1>
            <p className="text-gray-400">Manage administrator accounts with full system access</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex items-center gap-2 border-gray-700 text-white hover:bg-dark-card"
              onClick={refreshAdmins}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white"
              onClick={() => setIsAddAdminOpen(true)}
            >
              <UserPlus className="h-4 w-4" />
              Add Admin
            </Button>
          </div>
        </div>

        <Card className="bg-dark-card border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Shield className="mr-2 h-5 w-5 text-primary" />
              System Administrators
            </CardTitle>
            <CardDescription className="text-gray-400">
              Administrators have full access to manage all aspects of the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader className="bg-dark-surface">
                <TableRow className="hover:bg-dark-surface/80 border-gray-800">
                  <TableHead className="text-gray-400">Username</TableHead>
                  <TableHead className="text-gray-400">Email</TableHead>
                  <TableHead className="text-gray-400">Phone</TableHead>
                  <TableHead className="text-gray-400">Last Active</TableHead>
                  <TableHead className="text-gray-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {administrators?.map((admin: any) => (
                  <TableRow key={admin.id} className="hover:bg-dark-surface/50 border-gray-800">
                    <TableCell className="font-medium text-white">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        {admin.username}
                        {admin.username === "Sandeepkumarduli" && (
                          <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">System</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-300">{admin.email}</TableCell>
                    <TableCell className="text-gray-300">{admin.phone || "N/A"}</TableCell>
                    <TableCell className="text-gray-300">
                      {admin.lastActive ? format(new Date(admin.lastActive), "MMM d, h:mm a") : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-white">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-dark-card border-gray-700 text-white">
                          <DropdownMenuItem 
                            className="cursor-pointer hover:bg-dark-surface text-red-500"
                            onClick={() => handleRevokeAdmin(admin.id, admin.username)}
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            <span>Revoke Admin</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {administrators?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                      No administrators found. Add new administrators to manage the platform.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add Admin Dialog */}
      <Dialog open={isAddAdminOpen} onOpenChange={setIsAddAdminOpen}>
        <DialogContent className="bg-dark-card border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Add New Administrator</DialogTitle>
            <DialogDescription className="text-gray-400">
              Create a new administrator account with full system access
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Username
              </Label>
              <Input
                id="username"
                value={newAdmin.username}
                onChange={(e) => setNewAdmin({...newAdmin, username: e.target.value})}
                className="col-span-3 bg-dark-surface border-gray-700 text-white"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={newAdmin.email}
                onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
                className="col-span-3 bg-dark-surface border-gray-700 text-white"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={newAdmin.password}
                onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})}
                className="col-span-3 bg-dark-surface border-gray-700 text-white"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Phone
              </Label>
              <Input
                id="phone"
                value={newAdmin.phone}
                onChange={(e) => setNewAdmin({...newAdmin, phone: e.target.value})}
                className="col-span-3 bg-dark-surface border-gray-700 text-white"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsAddAdminOpen(false)}
              className="border-gray-700 text-white hover:bg-dark-surface"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleAddAdmin}
              className="bg-primary hover:bg-primary/90 text-white"
              disabled={addAdminMutation.isPending}
            >
              {addAdminMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Administrator"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}