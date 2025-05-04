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
import { 
  Loader2, 
  MoreVertical, 
  Users, 
  RefreshCw, 
  UserPlus, 
  Trash, 
  Shield, 
  User, 
  Eye
} from "lucide-react";
import { Link } from "wouter";

export default function AdminUsers() {
  const { isAdmin, isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    phone: "",
    role: "user"
  });

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      navigate("/auth");
    }
  }, [isAdmin, isAuthenticated, isLoading, navigate]);

  const { data: users = [], isLoading: isUsersLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
  });

  const refreshUsers = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({
        title: "Users list refreshed",
        description: "The users list has been refreshed successfully"
      });
    } catch (error) {
      toast({
        title: "Failed to refresh users",
        description: "There was an error refreshing the users list",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const addUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const res = await apiRequest("POST", "/api/admin/users", userData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsAddUserOpen(false);
      setNewUser({ username: "", email: "", password: "", phone: "", role: "user" });
      toast({
        title: "User added",
        description: "The new user has been added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      try {
        const res = await apiRequest("DELETE", `/api/admin/users/${userId}`, {});
        
        // Check if the response is ok before trying to parse JSON
        if (!res.ok) {
          const errorText = await res.text();
          try {
            // Try to parse the error as JSON
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.message || 'Failed to delete user');
          } catch (parseError) {
            // If parsing fails, use the raw text
            throw new Error(errorText || 'Failed to delete user');
          }
        }
        
        // If we reach here, the response was successful
        // Sometimes delete operations don't return content, so handle that case
        if (res.headers.get('content-length') === '0') {
          return { success: true };
        }
        
        return await res.json();
      } catch (error) {
        console.error("Error deleting user:", error);
        throw new Error(error instanceof Error ? error.message : "Failed to delete user");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User deleted",
        description: "The user has been deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete user",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const promoteToAdminMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role: "admin" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User promoted to admin",
        description: "The user has been granted administrator privileges",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to promote user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddUser = () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      toast({
        title: "Missing information",
        description: "Please provide all required fields",
        variant: "destructive",
      });
      return;
    }

    addUserMutation.mutate(newUser);
  };

  const handleDeleteUser = (userId: number, username: string) => {
    // Don't allow deleting the master admin account
    if (username === "Sandeepkumarduli") {
      toast({
        title: "Action not allowed",
        description: "Cannot delete the system administrator account",
        variant: "destructive",
      });
      return;
    }

    if (confirm(`Are you sure you want to delete user ${username}?`)) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handlePromoteToAdmin = (userId: number, username: string) => {
    if (confirm(`Are you sure you want to promote ${username} to administrator?`)) {
      promoteToAdminMutation.mutate(userId);
    }
  };

  if (isLoading || isUsersLoading) {
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
            <h1 className="text-3xl font-bold text-white mb-2">Users</h1>
            <p className="text-gray-400">Manage all registered users in the system</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex items-center gap-2 border-gray-700 text-white hover:bg-dark-card"
              onClick={refreshUsers}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white"
              onClick={() => setIsAddUserOpen(true)}
            >
              <UserPlus className="h-4 w-4" />
              Add User
            </Button>
          </div>
        </div>

        <Card className="bg-dark-card border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Users className="mr-2 h-5 w-5 text-primary" />
              All Registered Users
            </CardTitle>
            <CardDescription className="text-gray-400">
              Manage users, view their details, and assign admin privileges
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader className="bg-dark-surface">
                <TableRow className="hover:bg-dark-surface/80 border-gray-800">
                  <TableHead className="text-gray-400">Username</TableHead>
                  <TableHead className="text-gray-400">Email</TableHead>
                  <TableHead className="text-gray-400">Phone</TableHead>
                  <TableHead className="text-gray-400">Verified</TableHead>
                  <TableHead className="text-gray-400">Role</TableHead>
                  <TableHead className="text-gray-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user: any) => (
                  <TableRow key={user.id} className="hover:bg-dark-surface/50 border-gray-800">
                    <TableCell className="font-medium text-white">
                      <div className="flex items-center gap-2">
                        {user.role === "admin" ? (
                          <Shield className="h-4 w-4 text-primary" />
                        ) : (
                          <User className="h-4 w-4 text-gray-400" />
                        )}
                        {user.username}
                        {user.username === "Sandeepkumarduli" && (
                          <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">System</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-300">{user.email}</TableCell>
                    <TableCell className="text-gray-300">{user.phone || "N/A"}</TableCell>
                    <TableCell className="text-gray-300">
                      {user.phoneVerified ? (
                        <span className="px-2 py-1 bg-green-500/20 text-green-500 rounded-full text-xs">
                          Verified
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-red-500/20 text-red-500 rounded-full text-xs">
                          Unverified
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {user.role === "admin" ? (
                        <span className="px-2 py-1 bg-primary/20 text-primary rounded-full text-xs">
                          Administrator
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-700/50 text-gray-300 rounded-full text-xs">
                          User
                        </span>
                      )}
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
                          <Link href={`/admin/users/${user.id}`}>
                            <DropdownMenuItem className="cursor-pointer hover:bg-dark-surface">
                              <Eye className="mr-2 h-4 w-4" />
                              <span>View Details</span>
                            </DropdownMenuItem>
                          </Link>
                          {user.role !== "admin" && (
                            <DropdownMenuItem 
                              className="cursor-pointer hover:bg-dark-surface"
                              onClick={() => handlePromoteToAdmin(user.id, user.username)}
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              <span>Make Admin</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            className="cursor-pointer hover:bg-dark-surface text-red-500"
                            onClick={() => handleDeleteUser(user.id, user.username)}
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            <span>Delete User</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                      No users found. Add new users to populate the system.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="bg-dark-card border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription className="text-gray-400">
              Create a new user account with standard permissions
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Username
              </Label>
              <Input
                id="username"
                value={newUser.username}
                onChange={(e) => setNewUser({...newUser, username: e.target.value})}
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
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
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
                value={newUser.password}
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                className="col-span-3 bg-dark-surface border-gray-700 text-white"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Phone
              </Label>
              <Input
                id="phone"
                value={newUser.phone}
                onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                className="col-span-3 bg-dark-surface border-gray-700 text-white"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsAddUserOpen(false)}
              className="border-gray-700 text-white hover:bg-dark-surface"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleAddUser}
              className="bg-primary hover:bg-primary/90 text-white"
              disabled={addUserMutation.isPending}
            >
              {addUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}