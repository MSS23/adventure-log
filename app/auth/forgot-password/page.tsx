"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Globe, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/app/providers";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export const dynamic = "force-dynamic";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// Loading fallback component
function ForgotPasswordLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50">
      <div className="max-w-md w-full space-y-8 p-6">
        <div className="text-center">
          <Globe className="mx-auto h-12 w-12 text-primary animate-spin" />
          <h2 className="mt-6 text-3xl font-bold">Adventure Log</h2>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="h-4 bg-muted animate-pulse rounded" />
              <div className="h-10 bg-muted animate-pulse rounded" />
              <div className="h-10 bg-primary/20 animate-pulse rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Main content component that uses useSearchParams
function ForgotPasswordContent() {
  const { user, loading, resetPassword } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: searchParams?.get("email") || "",
    },
  });

  // Handle redirect for authenticated users
  useEffect(() => {
    if (!loading && user && !isRedirecting) {
      setIsRedirecting(true);
      const callbackUrl = searchParams?.get("callbackUrl") || "/dashboard";

      setTimeout(() => {
        router.push(callbackUrl);
      }, 1000);
    }
  }, [loading, user, router, searchParams, isRedirecting]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show redirect message for authenticated users
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <div className="max-w-md w-full space-y-6 text-center">
          <div>
            <Globe className="mx-auto h-12 w-12 text-primary mb-4" />
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Already Signed In!</h3>
            <p className="text-muted-foreground">
              Redirecting to your dashboard...
            </p>
            {user && (
              <p className="text-sm text-muted-foreground mt-2">
                Welcome back, {user.user_metadata?.name || user.email}!
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show success message if email was sent
  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <div className="max-w-md w-full space-y-8 p-6">
          <div className="text-center">
            <Globe className="mx-auto h-12 w-12 text-primary" />
            <h2 className="mt-6 text-3xl font-bold">Check Your Email</h2>
            <p className="mt-2 text-muted-foreground">
              Password reset instructions sent
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <CheckCircle className="mx-auto h-16 w-16 text-green-600" />

                <div>
                  <h3 className="text-lg font-medium mb-2">
                    Email Sent Successfully
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    We&apos;ve sent password reset instructions to your email
                    address. Please check your inbox and follow the link to
                    reset your password.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Didn&apos;t receive the email? Check your spam folder or try
                    again in a few minutes.
                  </p>
                </div>

                <div className="space-y-3 pt-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setEmailSent(false)}
                  >
                    Try Different Email
                  </Button>

                  <Button asChild className="w-full">
                    <Link href="/auth/signin">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Sign In
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);

    try {
      console.log("Requesting password reset for email:", data.email);
      await resetPassword(data.email);

      // Success is handled by the resetPassword function showing a toast
      // We'll show the success page
      setEmailSent(true);
    } catch (error) {
      console.error("Forgot password error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send reset email";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50">
      <div className="max-w-md w-full space-y-8 p-6">
        <div className="text-center">
          <Globe className="mx-auto h-12 w-12 text-primary" />
          <h2 className="mt-6 text-3xl font-bold">Reset Your Password</h2>
          <p className="mt-2 text-muted-foreground">
            Enter your email address and we&apos;ll send you instructions to
            reset your password
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Forgot Password</CardTitle>
            <CardDescription>
              We&apos;ll send you a secure link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type="email"
                            placeholder="Enter your email address"
                            className="pl-10"
                            disabled={isLoading}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading
                    ? "Sending Reset Email..."
                    : "Send Reset Instructions"}
                </Button>
              </form>
            </Form>

            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Remember your password?{" "}
                <Link
                  href="/auth/signin"
                  className="font-medium text-primary hover:underline"
                >
                  Sign in instead
                </Link>
              </p>

              <Button variant="ghost" asChild className="w-full">
                <Link href="/auth/signin">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sign In
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<ForgotPasswordLoading />}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
