import { useState } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

// Form Validation Schemas
const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  gameId: z.string().min(3, "Game ID must be at least 3 characters"),
});

type LoginValues = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated, user, login, register } = useAuth();
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  
  // Admin hardcoded, only user role is selectable
  const role = "user";

  // If already logged in, redirect to dashboard
  if (isAuthenticated && user) {
    navigate(user.role === "admin" ? "/admin/dashboard" : "/user/dashboard");
  }

  // Login Form
  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Signup Form
  const signupForm = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      phone: "",
      gameId: "",
    },
  });

  // Submit handlers
  const onLoginSubmit = async (values: LoginValues) => {
    try {
      await login(values);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const onSignupSubmit = async (values: SignupValues) => {
    try {
      await register({ ...values, role });
    } catch (error) {
      console.error("Signup failed:", error);
    }
  };

  return (
    <div className="flex min-h-screen bg-dark">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/30 via-dark to-purple-950/20 pointer-events-none"></div>
      
      {/* Left side - Auth form */}
      <div className="w-full lg:w-1/2 p-6 flex flex-col justify-center items-center relative z-10">
        <Card className="w-full max-w-md bg-dark-card border-gray-800 shadow-xl overflow-hidden">
          {/* Top gradient border */}
          <div className="h-1 w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600"></div>
          <CardHeader className="space-y-1">
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl font-bold">
                <span className="bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text">
                  {activeTab === "login" ? "Login" : "Create an account"}
                </span>
              </CardTitle>
            </div>
            <CardDescription className="text-gray-400">
              {activeTab === "login" 
                ? "Enter your credentials to access your account" 
                : "Create your tournament account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "signup")}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter your password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium shadow-md"
                      disabled={loginForm.formState.isSubmitting}
                    >
                      {loginForm.formState.isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                          Logging in...
                        </>
                      ) : (
                        "Log in"
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="signup">
                <Form {...signupForm}>
                  <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
                    <FormField
                      control={signupForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Choose a unique username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={signupForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter your email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={signupForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="Enter your phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={signupForm.control}
                      name="gameId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>BGMI Game ID</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your BGMI Game ID" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={signupForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Create a password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium shadow-md"
                      disabled={signupForm.formState.isSubmitting}
                    >
                      {signupForm.formState.isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                          Creating account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-center mt-2">
              <a 
                href="/forgot-password" 
                className="text-accent hover:text-primary text-sm"
              >
                Forgot your password?
              </a>
            </div>
          </CardFooter>
        </Card>
      </div>
      
      {/* Right side - Hero section */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-indigo-900/40 via-purple-900/30 to-dark flex-col justify-center items-center p-10 relative">
        {/* Add subtle animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 via-purple-600/5 to-dark opacity-70"></div>
        
        <div className="max-w-md text-center relative z-10">
          <h1 className="text-5xl font-bold mb-2">
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text">
              RD TOURNAMENTS
            </span>
            <span className="text-white"> HUB</span>
          </h1>
          <p className="text-xl text-indigo-300 mb-6 italic">
            An Ultimate Gaming Hub
          </p>
          <p className="text-gray-300 mb-8">
            Create teams, join tournaments, and compete with players from around the country.
            Experience gaming excellence across BGMI, FREEFIRE, and COD Mobile.
          </p>
          <div className="bg-black/40 p-6 rounded-lg backdrop-blur-sm border border-indigo-900/30">
            <h3 className="bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text font-semibold text-xl mb-3">
              Player Features:
            </h3>
            <ul className="text-left text-gray-300 space-y-2">
              <li className="flex items-center">
                <span className="bg-primary/20 p-1 rounded-full mr-2">✓</span> 
                Register for upcoming tournaments
              </li>
              <li className="flex items-center">
                <span className="bg-primary/20 p-1 rounded-full mr-2">✓</span> 
                Create and manage your team
              </li>
              <li className="flex items-center">
                <span className="bg-primary/20 p-1 rounded-full mr-2">✓</span> 
                Get room details for matches
              </li>
              <li className="flex items-center">
                <span className="bg-primary/20 p-1 rounded-full mr-2">✓</span> 
                Track your tournament history
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}