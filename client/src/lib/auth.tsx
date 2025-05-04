import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// Types
interface User {
  id: number;
  username: string;
  email: string;
  phone: string;
  phoneVerified?: boolean;
  gameId: string;
  role: string;
}

interface LoginCredentials {
  username: string;
  password: string;
}

interface RegisterData {
  username: string;
  password: string;
  email: string;
  phone: string;
  gameId: string;
  role?: string;
}

interface ProfileUpdateData {
  email?: string;
  password?: string;
  phone?: string;
  gameId?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: ProfileUpdateData) => Promise<void>;
  refreshUser: () => Promise<void>;
}

// Create context
const AuthContext = createContext<AuthContextType | null>(null);

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Check user session
  const { isLoading, refetch, data } = useQuery({
    queryKey: ["/api/user"],
    retry: false,
  });
  
  useEffect(() => {
    if (data) {
      setUser(data as User);
    } else {
      setUser(null);
    }
  }, [data]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      try {
        // Log login attempt data for debugging (not in production)
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Login attempt for ${credentials.username}`);
        }
        
        // Make the login request
        const res = await apiRequest("POST", "/api/login", credentials);
        
        // Check if the response is valid
        if (!res.ok) {
          // Try to get the error message from the response
          try {
            const errorData = await res.json();
            throw new Error(errorData.message || "Login failed due to server error");
          } catch (jsonError) {
            // If JSON parsing fails, use the status text
            throw new Error(`Login failed: ${res.status} ${res.statusText}`);
          }
        }
        
        // Parse the response JSON
        return res.json();
      } catch (error) {
        // Enhanced error logging
        if (process.env.NODE_ENV !== 'production') {
          console.error("Login error details:", error);
          
          // Special handling for admin login
          if (credentials.username === "Sandeepkumarduli" || 
              credentials.username === "admin@bgmi-tournaments.com") {
            console.error("Admin login failed with error:", error);
          }
        }
        
        // User-facing message remains simple
        throw new Error("Login failed. Please check username or password.");
      }
    },
    onSuccess: (data: User) => {
      // Log success for debugging
      console.log(`Login successful for ${data.username} with role ${data.role}`);
      
      setUser(data);
      refetch();
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.username}!`,
      });
      
      // Redirect based on role
      if (data.role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/user/dashboard");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Login Failed",
        description: "Please check username or password.",
        variant: "destructive",
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      try {
        const res = await apiRequest("POST", "/api/register", data);
        return res.json();
      } catch (error) {
        // Handle specific error cases more gracefully
        if (error instanceof Error) {
          if (error.message.includes("Email already exists")) {
            throw new Error("This email is already registered. Please login or use a different email address.");
          } else if (error.message.includes("Username already exists")) {
            throw new Error("This username is already taken. Please choose a different username.");
          } else if (error.message.includes("Game ID already exists")) {
            throw new Error("This Game ID is already registered. Please use a different Game ID.");
          } else if (error.message.includes("400") || error.message.includes("Bad Request")) {
            throw new Error("Please check all required fields are filled correctly.");
          } else {
            throw new Error("Registration failed. Please try again later.");
          }
        } else {
          throw new Error("An unexpected error occurred. Please try again later.");
        }
      }
    },
    onSuccess: (data: User) => {
      setUser(data);
      refetch();
      toast({
        title: "Registration successful",
        description: `Welcome, ${data.username}!`,
      });
      
      // Redirect based on role
      if (data.role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/user/dashboard");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message || "Please check your information and try again.",
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/logout", {});
      return res.json();
    },
    onSuccess: () => {
      setUser(null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      navigate("/");
    },
    onError: () => {
      toast({
        title: "Logout failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileUpdateData) => {
      try {
        const res = await apiRequest("PATCH", "/api/user", data);
        return res.json();
      } catch (error) {
        // Handle specific error cases more gracefully
        if (error instanceof Error) {
          if (error.message.includes("Email already exists")) {
            throw new Error("This email is already registered. Please use a different email address.");
          } else if (error.message.includes("Current password is incorrect")) {
            throw new Error("Your current password is incorrect. Please try again.");
          } else if (error.message.includes("Game ID already exists")) {
            throw new Error("This Game ID is already registered. Please use a different Game ID.");
          } else if (error.message.includes("Phone already exists")) {
            throw new Error("This phone number is already registered. Please use a different phone number.");
          } else if (error.message.includes("400") || error.message.includes("Bad Request")) {
            throw new Error("Please check all fields are filled correctly.");
          } else {
            throw new Error("Profile update failed. Please try again later.");
          }
        } else {
          throw new Error("An unexpected error occurred. Please try again later.");
        }
      }
    },
    onSuccess: (data: User) => {
      setUser(data);
      refetch();
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const login = async (credentials: LoginCredentials) => {
    await loginMutation.mutateAsync(credentials);
  };

  const register = async (data: RegisterData) => {
    await registerMutation.mutateAsync(data);
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };
  
  const updateProfile = async (data: ProfileUpdateData) => {
    await updateProfileMutation.mutateAsync(data);
  };
  
  const refreshUser = async () => {
    const result = await refetch();
    if (result.data) {
      setUser(result.data as User);
    }
  };

  const isAuthenticated = !!user;
  const isAdmin = isAuthenticated && user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin,
        isAuthenticated,
        login,
        register,
        logout,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}