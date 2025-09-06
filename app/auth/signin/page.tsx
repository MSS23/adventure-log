"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Globe,
  Mail,
  Lock,
  AlertCircle,
} from "lucide-react";
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

const signinSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type SigninFormData = z.infer<typeof signinSchema>;

// Loading fallback component
function SignInLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50">
      <div className="max-w-md w-full space-y-8 p-6">
        <div className="text-center">
          <Globe className="mx-auto h-12 w-12 text-primary animate-spin" />
          <h2 className="mt-6 text-3xl font-bold">Adventure Log</h2>
          <p className="mt-2 text-muted-foreground">Loading sign in...</p>
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
function SignInContent() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<SigninFormData>({
    resolver: zodResolver(signinSchema),
    defaultValues: {
      email: searchParams?.get("email") || "",
      password: "",
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

  // Handle auth errors from URL
  useEffect(() => {
    const authError = searchParams?.get("error");
    const errorMessage = searchParams?.get("message");
    
    if (authError) {
      let displayMessage = errorMessage || "Authentication failed";

      switch (authError) {
        case "cancelled":
          displayMessage = "Sign-in was cancelled";
          break;
        case "server_error":
          displayMessage = "Authentication server error. Please try again.";
          break;
        case "no_code":
          displayMessage = "No authorization code received. Please try signing in again.";
          break;
        case "session_error":
          displayMessage = "Failed to create session. Please try again.";
          break;
        case "no_session":
          displayMessage = "Session creation failed. Please try again.";
          break;
        case "unexpected_error":
          displayMessage = "An unexpected error occurred during sign-in. Please try again.";
          break;
        case "auth_error":
        default:
          displayMessage = errorMessage || "Authentication failed. Please try again.";
      }

      setError(displayMessage);
      toast.error(displayMessage);
      
      // Clean up URL parameters after showing error
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('error');
        url.searchParams.delete('message');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [searchParams]);

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
            <h3 className="text-lg font-medium mb-2">Welcome Back!</h3>
            <p className="text-muted-foreground">
              Redirecting to your dashboard...
            </p>
            {user && (
              <p className="text-sm text-muted-foreground mt-2">
                Hello, {user.user_metadata?.full_name || user.email}!
              </p>
            )}

            {/* Manual redirect option */}
            <div className="mt-6">
              <p className="text-xs text-muted-foreground mb-2">
                Taking too long?
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  const callbackUrl =
                    searchParams?.get("callbackUrl") || "/dashboard";
                  router.push(callbackUrl);
                }}
                size="sm"
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // For now, we'll disable email/password login since we're focusing on OAuth
  // This can be re-implemented later if needed
  const onSubmit = async (_data: SigninFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // For demo purposes, show that email/password is not yet implemented
      toast.error("Email/password login is not yet implemented. Please use Google sign-in.");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to sign in";
      console.error("Signin error:", error);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "apple") => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (provider === "google") {
        // Use Supabase auth for Google OAuth
        await signIn();
      } else {
        // Apple OAuth not yet implemented
        toast.error("Apple sign-in is not yet available. Please use Google.");
        setIsLoading(false);
      }
    } catch (error) {
      console.error(`${provider} sign-in error:`, error);
      const errorMessage = `Failed to sign in with ${provider.charAt(0).toUpperCase() + provider.slice(1)}`;
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
          <h2 className="mt-6 text-3xl font-bold">Sign in to Adventure Log</h2>
          <p className="mt-2 text-muted-foreground">
            Welcome back! Continue your journey.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Access your travel adventures and memories
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* OAuth Buttons */}
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => handleOAuthSignIn("google")}
                disabled={isLoading}
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>

              {/* Apple Sign In - conditional */}
              {process.env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED === "true" && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => handleOAuthSignIn("apple")}
                  disabled={isLoading}
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  Continue with Apple
                </Button>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-muted" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            {/* Email/Password Form - Temporarily disabled for OAuth focus */}
            <div className="opacity-50 pointer-events-none">
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
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              {...field}
                              type="email"
                              placeholder="Email login coming soon..."
                              className="pl-10"
                              disabled={true}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              {...field}
                              type="password"
                              placeholder="Password login coming soon..."
                              className="pl-10 pr-10"
                              disabled={true}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={true}>
                    Sign In (Coming Soon)
                  </Button>
                </form>
              </Form>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Email/password login will be available soon. Please use Google sign-in for now.
            </p>

            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link
                  href="/auth/signup"
                  className="font-medium text-primary hover:underline"
                >
                  Sign up
                </Link>
              </p>

              {/* Forgot Password Link */}
              <p className="text-xs text-muted-foreground">
                <Link
                  href="/auth/forgot-password"
                  className="text-primary hover:underline"
                >
                  Forgot your password?
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInLoading />}>
      <SignInContent />
    </Suspense>
  );
}
