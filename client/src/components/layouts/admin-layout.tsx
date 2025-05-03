import { ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  HomeIcon,
  TrophyIcon,
  UsersIcon,
  ShieldCheck,
  Settings,
  LogOut,
  BarChart,
  AlertTriangle,
  BellRing
} from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  
  // If not admin, redirect to home
  if (user?.role !== 'admin') {
    navigate('/');
    return null;
  }
  
  const menuItems = [
    {
      icon: <BarChart className="h-5 w-5 mr-3" />,
      text: "Dashboard",
      path: "/admin/dashboard",
      active: location === "/admin/dashboard"
    },
    {
      icon: <TrophyIcon className="h-5 w-5 mr-3" />,
      text: "Tournaments",
      path: "/admin/tournaments",
      active: location === "/admin/tournaments" || location.startsWith("/admin/tournaments/")
    },
    {
      icon: <UsersIcon className="h-5 w-5 mr-3" />,
      text: "Teams",
      path: "/admin/teams",
      active: location === "/admin/teams" || location.startsWith("/admin/teams/")
    },
    {
      icon: <UsersIcon className="h-5 w-5 mr-3" />,
      text: "Users",
      path: "/admin/users",
      active: location === "/admin/users" || location.startsWith("/admin/users/")
    },
    {
      icon: <ShieldCheck className="h-5 w-5 mr-3" />,
      text: "Admins",
      path: "/admin/admins",
      active: location === "/admin/admins"
    },
    {
      icon: <Settings className="h-5 w-5 mr-3" />,
      text: "Settings",
      path: "/admin/settings",
      active: location === "/admin/settings"
    }
  ];
  
  const handleLogout = () => {
    navigate("/auth");
  };
  
  return (
    <div className="flex min-h-screen bg-dark-background">
      {/* Sidebar - Fixed */}
      <div className="w-64 bg-dark-card border-r border-gray-800 flex flex-col fixed top-0 left-0 h-screen overflow-y-auto">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-6 w-6 text-accent" />
            <h1 className="text-xl font-bold text-white">Admin Panel</h1>
          </div>
          <p className="text-xs text-gray-400 mt-1">BGMI Tournament Management</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              className={`w-full justify-start py-2 px-3 ${
                item.active 
                  ? "bg-primary/20 text-primary hover:bg-primary/20" 
                  : "text-gray-300 hover:bg-dark-surface"
              }`}
              onClick={() => navigate(item.path)}
            >
              {item.icon}
              {item.text}
            </Button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-gray-800 space-y-3">
          <Button
            variant="ghost"
            className="w-full justify-start py-2 px-3 text-gray-300 hover:bg-dark-surface"
            onClick={() => navigate("/")}
          >
            <HomeIcon className="h-5 w-5 mr-3" />
            Back to Website
          </Button>
          
          <Button
            variant="ghost"
            className="w-full justify-start py-2 px-3 text-red-400 hover:bg-dark-surface"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </Button>
          
          <div className="bg-dark-surface rounded-md p-3 mt-3 border border-gray-800">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <p className="text-xs text-gray-300">Remember, all admin actions are logged for security</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content - with margin for sidebar */}
      <div className="flex-1 overflow-auto ml-64 pt-4">
        {children}
      </div>
    </div>
  );
}