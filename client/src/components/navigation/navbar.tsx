import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, X, User, Trophy, LogOut, Users, Home, Settings, Mail, Info, Gamepad } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const { user, isAdmin, isAuthenticated, logout } = useAuth();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <nav className="bg-dark-surface border-b border-gray-800 fixed w-full z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center">
                <span className="text-primary text-2xl font-bold">RD</span>
                <span className="text-white text-2xl font-bold ml-1">TOURNAMENTS</span>
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link href="/" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive("/") ? "border-primary text-white" : "border-transparent text-gray-300 hover:text-white hover:border-accent"}`}>
                Home
              </Link>
              <Link href="/tournaments" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive("/tournaments") ? "border-primary text-white" : "border-transparent text-gray-300 hover:text-white hover:border-accent"}`}>
                Tournaments
              </Link>
              <Link href="/games" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive("/games") ? "border-primary text-white" : "border-transparent text-gray-300 hover:text-white hover:border-accent"}`}>
                Games
              </Link>
              <Link href="/about" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive("/about") ? "border-primary text-white" : "border-transparent text-gray-300 hover:text-white hover:border-accent"}`}>
                About
              </Link>
              <Link href="/contact" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive("/contact") ? "border-primary text-white" : "border-transparent text-gray-300 hover:text-white hover:border-accent"}`}>
                Contact
              </Link>
              {isAuthenticated && !isAdmin && (
                <Link href="/user/team" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive("/user/team") ? "border-primary text-white" : "border-transparent text-gray-300 hover:text-white hover:border-accent"}`}>
                  Teams
                </Link>
              )}
              {isAuthenticated && isAdmin && (
                <>
                  <Link href="/admin/teams" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive("/admin/teams") ? "border-primary text-white" : "border-transparent text-gray-300 hover:text-white hover:border-accent"}`}>
                    Teams
                  </Link>
                  <Link href="/admin/users" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive("/admin/users") ? "border-primary text-white" : "border-transparent text-gray-300 hover:text-white hover:border-accent"}`}>
                    Users
                  </Link>
                  <Link href="/admin/admins" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive("/admin/admins") ? "border-primary text-white" : "border-transparent text-gray-300 hover:text-white hover:border-accent"}`}>
                    Admins
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative flex items-center gap-2 bg-primary/10 text-primary px-3">
                    <span className="text-white hidden md:inline">{user?.username}</span>
                    <div className="rounded-full h-10 w-10 flex items-center justify-center">
                      <User className="h-5 w-5" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-dark-card border-gray-800">
                  <DropdownMenuLabel className="text-white">{user?.username}</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-800" />
                  <DropdownMenuItem className="flex items-center text-gray-300 hover:text-white focus:text-white focus:bg-dark-surface">
                    <Link href={isAdmin ? "/admin/dashboard" : "/user/dashboard"} className="flex w-full">
                      <Trophy className="h-4 w-4 mr-2" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  {!isAdmin && (
                    <DropdownMenuItem className="flex items-center text-gray-300 hover:text-white focus:text-white focus:bg-dark-surface">
                      <Link href="/user/profile" className="flex w-full">
                        <User className="h-4 w-4 mr-2" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-gray-800" />
                  <DropdownMenuItem 
                    className="flex items-center text-gray-300 hover:text-white focus:text-white focus:bg-dark-surface cursor-pointer"
                    onClick={() => logout()}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <Button className="bg-primary hover:bg-primary/90 text-white glow-hover">
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button variant="outline" className="border-primary text-white hover:bg-dark-card glow-hover">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <Button variant="ghost" onClick={toggleMenu} className="text-gray-400">
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      <div className={`sm:hidden ${isOpen ? "block" : "hidden"}`}>
        <div className="pt-2 pb-3 space-y-1">
          <Link href="/" className={`block pl-3 pr-4 py-2 text-base font-medium ${isActive("/") ? "bg-primary text-white" : "text-gray-300 hover:bg-dark-card hover:text-white"}`}>
            <Home className="h-4 w-4 inline mr-2" />
            Home
          </Link>
          <Link href="/tournaments" className={`block pl-3 pr-4 py-2 text-base font-medium ${isActive("/tournaments") ? "bg-primary text-white" : "text-gray-300 hover:bg-dark-card hover:text-white"}`}>
            <Trophy className="h-4 w-4 inline mr-2" />
            Tournaments
          </Link>
          <Link href="/games" className={`block pl-3 pr-4 py-2 text-base font-medium ${isActive("/games") ? "bg-primary text-white" : "text-gray-300 hover:bg-dark-card hover:text-white"}`}>
            <Gamepad className="h-4 w-4 inline mr-2" />
            Games
          </Link>
          <Link href="/about" className={`block pl-3 pr-4 py-2 text-base font-medium ${isActive("/about") ? "bg-primary text-white" : "text-gray-300 hover:bg-dark-card hover:text-white"}`}>
            <Info className="h-4 w-4 inline mr-2" />
            About
          </Link>
          <Link href="/contact" className={`block pl-3 pr-4 py-2 text-base font-medium ${isActive("/contact") ? "bg-primary text-white" : "text-gray-300 hover:bg-dark-card hover:text-white"}`}>
            <Mail className="h-4 w-4 inline mr-2" />
            Contact
          </Link>
          {isAuthenticated && !isAdmin && (
            <Link href="/user/team" className={`block pl-3 pr-4 py-2 text-base font-medium ${isActive("/user/team") ? "bg-primary text-white" : "text-gray-300 hover:bg-dark-card hover:text-white"}`}>
              <Users className="h-4 w-4 inline mr-2" />
              Teams
            </Link>
          )}
          {isAuthenticated && isAdmin && (
            <>
              <Link href="/admin/teams" className={`block pl-3 pr-4 py-2 text-base font-medium ${isActive("/admin/teams") ? "bg-primary text-white" : "text-gray-300 hover:bg-dark-card hover:text-white"}`}>
                <Users className="h-4 w-4 inline mr-2" />
                Teams
              </Link>
              <Link href="/admin/users" className={`block pl-3 pr-4 py-2 text-base font-medium ${isActive("/admin/users") ? "bg-primary text-white" : "text-gray-300 hover:bg-dark-card hover:text-white"}`}>
                <Users className="h-4 w-4 inline mr-2" />
                Users
              </Link>
              <Link href="/admin/admins" className={`block pl-3 pr-4 py-2 text-base font-medium ${isActive("/admin/admins") ? "bg-primary text-white" : "text-gray-300 hover:bg-dark-card hover:text-white"}`}>
                <Users className="h-4 w-4 inline mr-2" />
                Admins
              </Link>
            </>
          )}
          {isAuthenticated ? (
            <>
              <div className="block pl-3 pr-4 py-2 text-base font-medium bg-dark-card text-white border-l-4 border-primary">
                <User className="h-4 w-4 inline mr-2" />
                {user?.username}
              </div>
              <Link href={isAdmin ? "/admin/dashboard" : "/user/dashboard"} className={`block pl-3 pr-4 py-2 text-base font-medium ${isActive(isAdmin ? "/admin/dashboard" : "/user/dashboard") ? "bg-primary text-white" : "text-gray-300 hover:bg-dark-card hover:text-white"}`}>
                <Trophy className="h-4 w-4 inline mr-2" />
                Dashboard
              </Link>
              {!isAdmin && (
                <Link href="/user/profile" className={`block pl-3 pr-4 py-2 text-base font-medium ${isActive("/user/profile") ? "bg-primary text-white" : "text-gray-300 hover:bg-dark-card hover:text-white"}`}>
                  <User className="h-4 w-4 inline mr-2" />
                  Profile
                </Link>
              )}
              <button 
                className="w-full text-left pl-3 pr-4 py-2 text-base font-medium text-gray-300 hover:bg-dark-card hover:text-white"
                onClick={() => logout()}
              >
                <LogOut className="h-4 w-4 inline mr-2" />
                Logout
              </button>
            </>
          ) : (
            <div className="mt-4 flex space-x-3 px-4">
              <Link href="/login">
                <Button className="bg-primary hover:bg-primary/90 text-white w-1/2">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="outline" className="border-primary text-white hover:bg-dark-card w-1/2">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}