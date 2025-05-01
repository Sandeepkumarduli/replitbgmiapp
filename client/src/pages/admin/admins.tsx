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
interface AdminUser extends BaseUser {
  lastActive?: string;
  activityCount?: number;
}

import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Filter, MoreVertical, Search, Trash, UsersRound, Eye, Shield, Mail, Clock } from "lucide-react";
import AdminLayout from "../../components/layouts/admin-layout";

type User = AdminUser;

export default function AdminsPage() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<User | null>(null);
  
  // Fetch all admin users
  const { data: admins, isLoading } = useQuery({
    queryKey: ['/api/admin/administrators'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/administrators');
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to fetch administrators');
      }
      return res.json() as Promise<User[]>;
    }
  });
  
  // Revoke admin privileges mutation
  const revokeAdminMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest('PATCH', `/api/admin/administrators/${userId}/revoke`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to revoke admin privileges');
      }
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Admin privileges revoked",
        description: "The user is no longer an administrator",
        variant: "default",
      });
      
      // Invalidate admins query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/admin/administrators'] });
      
      // Close the dialog
      setIsRevokeOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleRevokeAdmin = (admin: User) => {
    setSelectedAdmin(admin);
    setIsRevokeOpen(true);
  };
  
  const confirmRevoke = () => {
    if (selectedAdmin) {
      revokeAdminMutation.mutate(selectedAdmin.id);
    }
  };
  
  const filteredAdmins = admins ? admins.filter(admin => 
    admin.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (admin.email && admin.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    String(admin.id).includes(searchTerm)
  ) : [];
  
  // Sort administrators so the current user is always first
  const sortedAdmins = filteredAdmins.sort((a, b) => {
    if (a.id === user?.id) return -1;
    if (b.id === user?.id) return 1;
    return 0;
  });
  
  return (
    <AdminLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Administrators</h2>
            <p className="text-gray-400 mt-1">
              View and manage all administrators with platform access
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 self-stretch sm:self-auto">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Search admins..."
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
              <CardTitle className="text-xl text-white">Administrator List</CardTitle>
              <Badge variant="outline" className="text-accent border-accent">
                <Shield className="h-3 w-3 mr-1" />
                {admins?.length || 0} Admins
              </Badge>
            </div>
            <CardDescription>
              Users with elevated privileges who can manage the platform
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
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Last Active</TableHead>
                    <TableHead className="text-right text-gray-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAdmins.length > 0 ? (
                    sortedAdmins.map((admin) => (
                      <TableRow 
                        key={admin.id} 
                        className={`hover:bg-dark-surface/50 border-gray-800 hover:cursor-pointer ${
                          admin.id === user?.id ? 'bg-primary/5' : ''
                        }`}
                      >
                        <TableCell className="font-mono text-gray-400">
                          {admin.id}
                        </TableCell>
                        <TableCell className="font-semibold text-white">
                          <div className="flex items-center">
                            {admin.id === user?.id && (
                              <Badge variant="outline" className="mr-2 bg-primary/10 text-primary border-primary text-xs">
                                You
                              </Badge>
                            )}
                            {admin.username}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          <span className="flex items-center">
                            <Mail className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                            {admin.email || "No email"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className="bg-accent/10 text-accent border-accent"
                          >
                            <Shield className="h-3 w-3 mr-1" />
                            Administrator
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          <span className="flex items-center">
                            <Clock className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                            {admin.lastActive ? new Date(admin.lastActive).toLocaleString() : "Unknown"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                className="h-8 w-8 p-0 text-gray-300 hover:bg-dark-surface"
                                disabled={admin.id === user?.id} // Can't perform actions on yourself
                              >
                                <span className="sr-only">Open menu</span>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-dark-card border-gray-800 text-white">
                              <DropdownMenuItem 
                                className="hover:bg-dark-surface cursor-pointer"
                                onClick={() => navigate(`/admin/users/${admin.id}`)}
                              >
                                <Eye className="mr-2 h-4 w-4 text-primary" />
                                View Profile
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-gray-800" />
                              <DropdownMenuItem 
                                className="hover:bg-dark-surface text-red-500 cursor-pointer"
                                onClick={() => handleRevokeAdmin(admin)}
                              >
                                <Trash className="mr-2 h-4 w-4" />
                                Revoke Admin
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-400 py-6">
                        {searchTerm ? "No admins match your search" : "No administrators found"}
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
              Administrator accounts have full access to manage the platform
            </div>
          </CardFooter>
        </Card>

        {/* Revoke Admin Confirmation Dialog */}
        <Dialog open={isRevokeOpen} onOpenChange={setIsRevokeOpen}>
          <DialogContent className="bg-dark-card border-gray-800 text-white">
            <DialogHeader>
              <DialogTitle>Confirm Admin Revocation</DialogTitle>
              <DialogDescription className="text-gray-400">
                This action will revoke administrator privileges from &quot;{selectedAdmin?.username}&quot;.
                They will still be able to use the platform as a regular user.
              </DialogDescription>
            </DialogHeader>
            <div className="p-4 bg-dark-surface rounded-md border border-gray-800 mt-2">
              <p className="font-semibold text-primary">Important:</p>
              <ul className="list-disc pl-5 mt-2 text-sm text-gray-300 space-y-1">
                <li>This user will no longer have access to the admin panel</li>
                <li>They will not be able to manage tournaments, teams, or users</li>
                <li>Their account will remain active as a regular user</li>
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
                onClick={confirmRevoke}
                disabled={revokeAdminMutation.isPending}
              >
                {revokeAdminMutation.isPending ? "Revoking..." : "Revoke Admin"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}