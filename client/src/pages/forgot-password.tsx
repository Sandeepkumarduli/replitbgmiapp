import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Mail } from "lucide-react";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type FormValues = z.infer<typeof formSchema>;

export default function ForgotPassword() {
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Simulating API call since we don't have actual email reset functionality
      // In a real app, this would connect to an API endpoint
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true });
        }, 1000);
      });
    },
    onSuccess: () => {
      setEmailSent(true);
      toast({
        title: "Reset link sent",
        description: "If an account exists with that email, you will receive a password reset link.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send reset link",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    resetMutation.mutate(values);
  };

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4">
      <Card className="w-full max-w-md border-gray-800 bg-dark-card shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold text-white">Forgot Password</CardTitle>
            <Link href="/login" className="text-primary hover:text-primary/90">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </div>
          <CardDescription className="text-gray-400">
            {emailSent
              ? "Instructions have been sent to your email"
              : "Enter your email and we'll send you a reset link"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emailSent ? (
            <div className="text-center py-6">
              <div className="mb-4 bg-primary/10 mx-auto h-16 w-16 rounded-full flex items-center justify-center">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <p className="text-gray-300 mb-4">
                We've sent password reset instructions to your email address. Please check your inbox.
              </p>
              <p className="text-gray-400 text-sm">
                Didn't receive an email? Check your spam folder or make sure you entered the correct email address.
              </p>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="Enter your email address"
                          className="bg-dark-surface border-gray-700 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                  disabled={resetMutation.isPending}
                >
                  {resetMutation.isPending ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center border-t border-gray-800 pt-4">
          <div className="text-sm text-gray-400">
            Remember your password?{" "}
            <Link href="/login" className="text-primary hover:text-primary/90 font-medium">
              Back to login
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}