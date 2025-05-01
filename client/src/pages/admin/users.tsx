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
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
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
  Search,
  MoreVertical,
  UserX,
  RefreshCw,
  ShieldCheck,
  Shield,
  Eye,
  User,
  Award
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { User as UserType } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

export default function AdminUsers() {
  const { isAdmin, isAuthenticated, isLoading, user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchBy, setSearchBy] = useState<"username" | "email" | "phone" | "gameId">("username");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      navigate("/auth");
    }
  }, [isAdmin, isAuthenticated, isLoading, navigate]);

  // Fetch users data
  const { data: users, isLoading: isLoadingUsers } = useQuery<UserType[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated && isAdmin,
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User deleted",
        description: "The user has been removed successfully",
      });
      setIsDeleteOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number, role: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Role updated",
        description: "The user's role has been updated successfully",
      });
      setIsRoleOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle delete user
  const handleDeleteUser = (user: UserType) => {
    setSelectedUser(user);
    setIsDeleteOpen(true);
  };

  // Handle change role
  const handleChangeRole = (user: UserType) => {
    setSelectedUser(user);
    setIsRoleOpen(true);
  };

  // Confirm delete
  const confirmDelete = () => {
    if (selectedUser) {
      deleteUserMutation.mutate(selectedUser.id);
    }
  };

  // Promote to admin
  const promoteToAdmin = () => {
    if (selectedUser) {
      updateRoleMutation.mutate({ userId: selectedUser.id, role: "admin" });
    }
  };

  // Demote to user
  const demoteToUser = () => {
    if (selectedUser) {
      updateRoleMutation.mutate({ userId: selectedUser.id, role: "user" });
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    
    try {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      
      toast({
        title: "Refreshed",
        description: "Users data has been refreshed",
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Failed to refresh users data",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter users based on search term
  const filteredUsers = users?.filter(user => {
    const searchValue = user[searchBy]?.toLowerCase() || "";
    return searchValue.includes(searchTerm.toLowerCase());
  });

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
          <h1 className="text-3xl font-bold text-white mb-2">Users Management</h1>
          <p className="text-gray-400">Manage all users registered on the platform</p>
        </div>
        <Button 
          className="bg-primary hover:bg-primary/90 text-white mt-4 md:mt-0"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Search and filter */}
      <Card className="bg-dark-card border-gray-800 mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="col-span-1 md:col-span-3 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder={`Search by ${searchBy}...`}
                className="bg-dark-surface pl-10 border-gray-700 text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="col-span-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full border-gray-700 text-white hover:bg-dark-surface">
                    Search by: {searchBy}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-dark-card border-gray-800 text-white">
                  <DropdownMenuItem 
                    className="hover:bg-dark-surface cursor-pointer"
                    onClick={() => setSearchBy("username")}
                  >
                    Username
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="hover:bg-dark-surface cursor-pointer"
                    onClick={() => setSearchBy("email")}
                  >
                    Email
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="hover:bg-dark-surface cursor-pointer"
                    onClick={() => setSearchBy("phone")}
                  >
                    Phone
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="hover:bg-dark-surface cursor-pointer"
                    onClick={() => setSearchBy("gameId")}
                  >
                    Game ID
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="bg-dark-card border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-xl">All Users</CardTitle>
          <CardDescription className="text-gray-400">
            Showing {filteredUsers?.length || 0} users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
            <div className="flex justify-center py-6">
              <RefreshCw className="h-6 w-6 text-primary animate-spin" />
            </div>
          ) : (
            <Table>
              <TableCaption>List of all registered users</TableCaption>
              <TableHeader>
                <TableRow className="border-gray-800">
                  <TableHead className="text-gray-300">Username</TableHead>
                  <TableHead className="text-gray-300">Game ID</TableHead>
                  <TableHead className="text-gray-300">Email</TableHead>
                  <TableHead className="text-gray-300">Role</TableHead>
                  <TableHead className="text-gray-300">Joined</TableHead>
                  <TableHead className="text-gray-300 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers && filteredUsers.length > 0 ? (
                  filteredUsers.map((userData) => (
                    <TableRow key={userData.id} className="border-gray-800">
                      <TableCell className="font-medium text-white">{userData.username}</TableCell>
                      <TableCell className="text-gray-300">{userData.gameId}</TableCell>
                      <TableCell className="text-gray-300">{userData.email}</TableCell>
                      <TableCell>
                        <Badge className={userData.role === 'admin' 
                          ? 'bg-accent/20 text-accent hover:bg-accent/30' 
                          : 'bg-primary/20 text-primary hover:bg-primary/30'
                        }>
                          {userData.role === 'admin' 
                            ? <ShieldCheck className="h-3 w-3 mr-1" /> 
                            : <User className="h-3 w-3 mr-1" />
                          }
                          {userData.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {new Date(userData.createdAt).toLocaleDateString()}
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
                              onClick={() => navigate(`/admin/users/${userData.id}`)}
                            >
                              <Eye className="mr-2 h-4 w-4 text-primary" />
                              View Details
                            </DropdownMenuItem>
                            
                            {/* Don't allow changing the hardcoded admin's role */}
                            {userData.username !== "Sandeepkumarduli" && (
                              <>
                                <DropdownMenuSeparator className="bg-gray-800" />
                                {userData.role === 'user' ? (
                                  <DropdownMenuItem 
                                    className="hover:bg-dark-surface cursor-pointer"
                                    onClick={() => handleChangeRole(userData)}
                                  >
                                    <Shield className="mr-2 h-4 w-4 text-accent" />
                                    Promote to Admin
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem 
                                    className="hover:bg-dark-surface cursor-pointer"
                                    onClick={() => handleChangeRole(userData)}
                                  >
                                    <User className="mr-2 h-4 w-4 text-primary" />
                                    Demote to User
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                            
                            {/* Don't allow deleting current user or the hardcoded admin */}
                            {userData.id !== user?.id && userData.username !== "Sandeepkumarduli" && (
                              <>
                                <DropdownMenuSeparator className="bg-gray-800" />
                                <DropdownMenuItem 
                                  className="hover:bg-dark-surface text-red-500 cursor-pointer"
                                  onClick={() => handleDeleteUser(userData)}
                                >
                                  <UserX className="mr-2 h-4 w-4" />
                                  Delete User
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-400 py-6">
                      {searchTerm ? "No users match your search" : "No users found"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="bg-dark-card border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Confirm User Deletion</DialogTitle>
            <DialogDescription className="text-gray-400">
              This action will permanently delete the user account, their teams, and all associated data.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-gray-700 text-white hover:bg-dark-surface">
                Cancel
              </Button>
            </DialogClose>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={isRoleOpen} onOpenChange={setIsRoleOpen}>
        <DialogContent className="bg-dark-card border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.role === 'user' ? 'Promote to Admin' : 'Demote to User'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedUser?.role === 'user' 
                ? 'Are you sure you want to promote this user to admin? Admins have complete access to all platform features and data.'
                : 'Are you sure you want to demote this admin to regular user? They will lose access to all admin features.'}
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-dark-surface rounded-md border border-gray-800 mb-4">
            <div className="flex items-center">
              <div className="bg-dark-card p-2 rounded-full">
                {selectedUser?.role === 'user' 
                  ? <User className="h-5 w-5 text-primary" />
                  : <ShieldCheck className="h-5 w-5 text-accent" />
                }
              </div>
              <div className="ml-3">
                <p className="text-white font-medium">{selectedUser?.username}</p>
                <p className="text-gray-400 text-sm">{selectedUser?.email}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center">
              <Award className="h-4 w-4 text-amber-500 mr-2" />
              <p className="text-gray-300 text-sm">
                Current role: <span className="font-medium">{selectedUser?.role}</span>
              </p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-gray-700 text-white hover:bg-dark-surface">
                Cancel
              </Button>
            </DialogClose>
            {selectedUser?.role === 'user' ? (
              <Button 
                className="bg-accent hover:bg-accent/90 text-white"
                onClick={promoteToAdmin}
                disabled={updateRoleMutation.isPending}
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                {updateRoleMutation.isPending ? "Promoting..." : "Promote to Admin"}
              </Button>
            ) : (
              <Button 
                className="bg-primary hover:bg-primary/90 text-white"
                onClick={demoteToUser}
                disabled={updateRoleMutation.isPending}
              >
                <User className="mr-2 h-4 w-4" />
                {updateRoleMutation.isPending ? "Demoting..." : "Demote to User"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}