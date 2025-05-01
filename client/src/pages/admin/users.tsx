import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { User as BaseUser } from "@shared/schema";

// Extend the User type to include additional properties
interface EnhancedUser extends BaseUser {
  teamCount?: number;
  registrations?: number;
}

import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Filter, MoreVertical, Search, Trash, UsersRound, Eye, Shield, Mail } from "lucide-react";
import AdminLayout from "../../components/layouts/admin-layout";

type User = EnhancedUser;

export default function AdminUsers() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Fetch all users
  const { data: users, isLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/users');
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to fetch users');
      }
      return res.json() as Promise<User[]>;
    }
  });
  
  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest('DELETE', `/api/admin/users/${userId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to delete user');
      }
      return true;
    },
    onSuccess: () => {
      toast({
        title: "User deleted",
        description: "The user has been successfully deleted",
        variant: "default",
      });
      
      // Invalidate users query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      
      // Close the dialog
      setIsDeleteOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setIsDeleteOpen(true);
  };
  
  const confirmDelete = () => {
    if (selectedUser) {
      deleteUserMutation.mutate(selectedUser.id);
    }
  };
  
  const filteredUsers = users ? users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    String(user.id).includes(searchTerm)
  ) : [];
  
  return (
    <AdminLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Users Management</h2>
            <p className="text-gray-400 mt-1">
              View and manage all users registered on the platform
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 self-stretch sm:self-auto">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Search users..."
                className="pl-8 bg-dark-surface border-gray-800 text-white w-full sm:w-[250px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      
        <Card className="bg-dark-card border-gray-800 overflow-hidden">
          <CardHeader className="bg-dark-surface border-b border-gray-800 pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl text-white">User List</CardTitle>
              <Badge variant="outline" className="text-primary border-primary">
                <UsersRound className="h-3 w-3 mr-1" />
                {users?.length || 0} Users
              </Badge>
            </div>
            <CardDescription>
              All users registered on the platform
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-12 w-full bg-dark-surface" />
                <Skeleton className="h-12 w-full bg-dark-surface" />
                <Skeleton className="h-12 w-full bg-dark-surface" />
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-dark-surface">
                  <TableRow className="hover:bg-dark-surface/80 border-gray-800">
                    <TableHead className="text-gray-400">ID</TableHead>
                    <TableHead className="text-gray-400">Username</TableHead>
                    <TableHead className="text-gray-400">Email</TableHead>
                    <TableHead className="text-gray-400">Role</TableHead>
                    <TableHead className="text-gray-400">Teams</TableHead>
                    <TableHead className="text-right text-gray-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <TableRow 
                        key={user.id} 
                        className="hover:bg-dark-surface/50 border-gray-800 hover:cursor-pointer"
                      >
                        <TableCell className="font-mono text-gray-400">
                          {user.id}
                        </TableCell>
                        <TableCell className="font-semibold text-white">
                          {user.username}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          <span className="flex items-center">
                            <Mail className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                            {user.email || "No email"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={user.role === 'admin' ? "outline" : "secondary"} 
                            className={`${
                              user.role === 'admin' 
                                ? "bg-accent/10 text-accent border-accent" 
                                : "bg-primary/10 text-primary border-primary"
                            }`}
                          >
                            <Shield className="h-3 w-3 mr-1" />
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {user.teamCount || 0} teams
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
                                onClick={() => navigate(`/admin/users/${user.id}`)}
                              >
                                <Eye className="mr-2 h-4 w-4 text-primary" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-gray-800" />
                              <DropdownMenuItem 
                                className="hover:bg-dark-surface text-red-500 cursor-pointer"
                                onClick={() => handleDeleteUser(user)}
                                disabled={user.role === 'admin'}
                              >
                                <Trash className="mr-2 h-4 w-4" />
                                Delete User
                              </DropdownMenuItem>
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
          <CardFooter className="border-t border-gray-800 p-4">
            <div className="text-xs text-gray-400 flex items-center">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              Manage users and their permissions
            </div>
          </CardFooter>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent className="bg-dark-card border-gray-800 text-white">
            <DialogHeader>
              <DialogTitle>Confirm User Deletion</DialogTitle>
              <DialogDescription className="text-gray-400">
                This action will permanently delete the user &quot;{selectedUser?.username}&quot; and all associated data.
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="p-4 bg-dark-surface rounded-md border border-gray-800 mt-2">
              <p className="font-semibold text-primary">Important:</p>
              <ul className="list-disc pl-5 mt-2 text-sm text-gray-300 space-y-1">
                <li>All teams owned by this user will be deleted</li>
                <li>All tournament registrations by this user will be removed</li>
                <li>User account will be permanently removed from the system</li>
              </ul>
            </div>
            <DialogFooter className="mt-4">
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
      </div>
    </AdminLayout>
  );
}