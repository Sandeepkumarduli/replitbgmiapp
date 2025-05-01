import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AuthFormProps = {
  type: "login" | "signup";
  role: "user" | "admin";
  initialTab?: "user" | "admin";
};

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

const signupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  gameId: z.string().min(3, "Game ID must be at least 3 characters"),
  rememberMe: z.boolean().optional(),
});

type LoginValues = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;

export function AuthForm({ type, role, initialTab = "user" }: AuthFormProps) {
  const { login, register } = useAuth();
  const [activeTab, setActiveTab] = useState<string>(role);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  const signupForm = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      phone: "",
      gameId: "",
      rememberMe: false,
    },
  });

  const onLoginSubmit = async (values: LoginValues) => {
    await login({
      username: values.username,
      password: values.password,
    });
  };

  const onSignupSubmit = async (values: SignupValues) => {
    const userData = {
      ...values,
      role: activeTab as "user" | "admin",
      // Completely remove gameId for admins
      ...(activeTab === 'admin' ? { gameId: '' } : {})
    };
    
    await register(userData);
  };

  return (
    <div className="w-full max-w-md mx-4 bg-dark-card border border-gray-800 rounded-lg shadow-lg overflow-hidden">
      {type === "login" && (
        <div className="flex border-b border-gray-800">
          <button
            className={`w-1/2 py-4 font-medium ${
              activeTab === "user" ? "bg-primary text-white" : "text-gray-400 hover:bg-dark-surface"
            }`}
            onClick={() => setActiveTab("user")}
          >
            User
          </button>
          <button
            className={`w-1/2 py-4 font-medium ${
              activeTab === "admin" ? "bg-primary text-white" : "text-gray-400 hover:bg-dark-surface"
            }`}
            onClick={() => setActiveTab("admin")}
          >
            Admin
          </button>
        </div>
      )}

      <div className="p-6">
        <h3 className="text-xl font-bold text-white mb-6 text-center">
          {type === "login" ? `${activeTab === "admin" ? "Admin" : "User"} Login` : `${activeTab === "admin" ? "Admin" : "User"} Signup`}
        </h3>

        {type === "login" ? (
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
              <FormField
                control={loginForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Username</FormLabel>
                    <FormControl>
                      <Input
                        className="bg-dark-surface border-gray-700 text-white focus:ring-primary"
                        placeholder="Enter your username"
                        autoComplete="off"
                        {...field}
                      />
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
                    <FormLabel className="text-white">Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        className="bg-dark-surface border-gray-700 text-white focus:ring-primary"
                        placeholder="Enter your password"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between">
                <FormField
                  control={loginForm.control}
                  name="rememberMe"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          id="remember-me"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="text-primary focus:ring-primary border-gray-700 rounded data-[state=checked]:bg-primary data-[state=checked]:text-white"
                        />
                      </FormControl>
                      <label
                        htmlFor="remember-me"
                        className="text-sm font-medium text-gray-400 cursor-pointer"
                      >
                        Remember me
                      </label>
                    </FormItem>
                  )}
                />
                <a href="#" className="text-primary text-sm hover:text-primary/80">
                  Forgot password?
                </a>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white font-medium glow-hover"
                disabled={loginForm.formState.isSubmitting}
              >
                {loginForm.formState.isSubmitting ? "Signing in..." : "Sign In"}
              </Button>

              <div className="text-center mt-4">
                <p className="text-gray-400 text-sm">
                  Don't have an account?{" "}
                  <Link href={activeTab === "admin" ? "/admin/signup" : "/signup"} className="text-accent hover:text-accent/80">
                    Sign up here
                  </Link>
                </p>
              </div>
            </form>
          </Form>
        ) : (
          <Form {...signupForm}>
            <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
              <FormField
                control={signupForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Username</FormLabel>
                    <FormControl>
                      <Input
                        className="bg-dark-surface border-gray-700 text-white focus:ring-primary"
                        placeholder="Choose a username"
                        autoComplete="off"
                        {...field}
                      />
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
                    <FormLabel className="text-white">Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        className="bg-dark-surface border-gray-700 text-white focus:ring-primary"
                        placeholder="Enter your email"
                        autoComplete="off"
                        {...field}
                      />
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
                    <FormLabel className="text-white">Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        className="bg-dark-surface border-gray-700 text-white focus:ring-primary"
                        placeholder="Enter your phone number"
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {activeTab === 'user' && (
                <FormField
                  control={signupForm.control}
                  name="gameId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Game ID</FormLabel>
                      <FormControl>
                        <Input
                          className="bg-dark-surface border-gray-700 text-white focus:ring-primary"
                          placeholder="Enter your BGMI game ID"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={signupForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        className="bg-dark-surface border-gray-700 text-white focus:ring-primary"
                        placeholder="Create a password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={signupForm.control}
                name="rememberMe"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        id="terms"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="text-primary focus:ring-primary border-gray-700 rounded data-[state=checked]:bg-primary data-[state=checked]:text-white"
                      />
                    </FormControl>
                    <label
                      htmlFor="terms"
                      className="text-sm font-medium text-gray-400 cursor-pointer"
                    >
                      I agree to the terms and conditions
                    </label>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white font-medium glow-hover"
                disabled={signupForm.formState.isSubmitting}
              >
                {signupForm.formState.isSubmitting ? "Creating account..." : "Create Account"}
              </Button>

              <div className="text-center mt-4">
                <p className="text-gray-400 text-sm">
                  Already have an account?{" "}
                  <Link href={activeTab === "admin" ? "/admin/login" : "/login"} className="text-accent hover:text-accent/80">
                    Sign in here
                  </Link>
                </p>
              </div>
            </form>
          </Form>
        )}
      </div>
    </div>
  );
}
