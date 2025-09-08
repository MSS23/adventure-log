"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Globe,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/app/providers";
import { createClient } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export const dynamic = "force-dynamic";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /(?=.*[a-z])/,
        "Password must contain at least one lowercase letter"
      )
      .regex(
        /(?=.*[A-Z])/,
        "Password must contain at least one uppercase letter"
      )
      .regex(/(?=.*\d)/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// Loading fallback component
function ResetPasswordLoading() {
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
function ResetPasswordContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyingToken, setVerifyingToken] = useState(true);
  const [validToken, setValidToken] = useState(false);

  const supabase = createClient();

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Verify the password reset token on component mount
  useEffect(() => {
    async function verifyResetToken() {
      const accessToken = searchParams?.get("access_token");
      const refreshToken = searchParams?.get("refresh_token");
      const type = searchParams?.get("type");

      if (type === "recovery" && accessToken && refreshToken) {
        try {
          // Set the session using the tokens from the URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error("Error setting session from reset tokens:", error);
            setError(
              "Invalid or expired reset link. Please request a new password reset."
            );
          } else if (data.session) {
            console.log("Reset token verified successfully");
            setValidToken(true);
          }
        } catch (error) {
          console.error("Error verifying reset token:", error);
          setError("Failed to verify reset link. Please try again.");
        }
      } else {
        setError("Invalid reset link. Please request a new password reset.");
      }

      setVerifyingToken(false);
    }

    verifyResetToken();
  }, [searchParams, supabase.auth]);

  // Redirect authenticated users (unless they're in a password reset flow)
  useEffect(() => {
    if (!loading && !verifyingToken && user && validToken) {
      // User is authenticated via reset token - allow password reset
      return;
    }

    if (!loading && !verifyingToken && user && !validToken) {
      // User is already signed in normally - redirect to dashboard
      router.push("/dashboard");
    }
  }, [loading, verifyingToken, user, validToken, router]);

  // Show loading state while verifying token
  if (verifyingToken || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  // Show error if token verification failed
  if (error && !validToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <div className="max-w-md w-full space-y-8 p-6">
          <div className="text-center">
            <Globe className="mx-auto h-12 w-12 text-primary" />
            <h2 className="mt-6 text-3xl font-bold">Reset Link Invalid</h2>
            <p className="mt-2 text-muted-foreground">
              This password reset link is invalid or has expired
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <AlertCircle className="mx-auto h-16 w-16 text-red-600" />

                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>

                <div className="space-y-3 pt-4">
                  <Button asChild className="w-full">
                    <Link href="/auth/forgot-password">
                      Request New Reset Link
                    </Link>
                  </Button>

                  <Button variant="outline" asChild className="w-full">
                    <Link href="/auth/signin">Back to Sign In</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show success message if password was reset
  if (resetSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <div className="max-w-md w-full space-y-8 p-6">
          <div className="text-center">
            <Globe className="mx-auto h-12 w-12 text-primary" />
            <h2 className="mt-6 text-3xl font-bold">Password Reset Complete</h2>
            <p className="mt-2 text-muted-foreground">
              Your password has been successfully updated
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <CheckCircle className="mx-auto h-16 w-16 text-green-600" />

                <div>
                  <h3 className="text-lg font-medium mb-2">Success!</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Your password has been updated successfully. You can now
                    sign in with your new password.
                  </p>
                </div>

                <Button asChild className="w-full">
                  <Link href="/auth/signin">Continue to Sign In</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("Updating password...");

      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        console.error("Password update error:", error);

        if (error.message.includes("New password should be different")) {
          setError(
            "New password must be different from your current password."
          );
        } else if (error.message.includes("Password should be at least")) {
          setError("Password does not meet the minimum requirements.");
        } else {
          setError(`Failed to update password: ${error.message}`);
        }

        setIsLoading(false);
        return;
      }

      console.log("Password updated successfully");
      toast.success("Password updated successfully!");
      setResetSuccess(true);

      // Sign out the user so they can sign in with the new password
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Reset password error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to reset password";
      setError(errorMessage);
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50">
      <div className="max-w-md w-full space-y-8 p-6">
        <div className="text-center">
          <Globe className="mx-auto h-12 w-12 text-primary" />
          <h2 className="mt-6 text-3xl font-bold">Set New Password</h2>
          <p className="mt-2 text-muted-foreground">
            Choose a strong password to secure your account
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>Enter your new password below</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your new password"
                            className="pl-10 pr-10"
                            disabled={isLoading}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={isLoading}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm your new password"
                            className="pl-10 pr-10"
                            disabled={isLoading}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2"
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                            disabled={isLoading}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Updating Password..." : "Update Password"}
                </Button>
              </form>
            </Form>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Remember your password?{" "}
                <Link
                  href="/auth/signin"
                  className="font-medium text-primary hover:underline"
                >
                  Sign in instead
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordLoading />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
