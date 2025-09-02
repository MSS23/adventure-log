"use client";

import { Globe, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [redirectAttempts, setRedirectAttempts] = useState(0);
  const [redirectError, setRedirectError] = useState<string | null>(null);

  // Enhanced redirect logic with error handling and retry
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const attemptRedirect = async () => {
        try {
          logger.debug("🔄 Attempting redirect to dashboard", {
            attempts: redirectAttempts + 1,
            userId: session.user?.id,
            userEmail: session.user?.email,
          });

          setRedirectAttempts(prev => prev + 1);
          
          // Use replace instead of push for cleaner navigation
          await router.replace("/dashboard");
        } catch (error) {
          logger.error("❌ Redirect failed:", error);
          setRedirectError("Failed to redirect to dashboard. Please try manually.");
        }
      };

      // Add small delay to ensure session is fully established
      const timeout = setTimeout(attemptRedirect, 100);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [status, session, router, redirectAttempts]);

  // Fallback redirect after timeout
  useEffect(() => {
    if (status === "authenticated" && redirectAttempts > 0 && redirectAttempts < 3) {
      const retryTimeout = setTimeout(() => {
        logger.debug("🔄 Retry redirect after timeout");
        setRedirectAttempts(prev => prev + 1);
      }, 2000);

      return () => clearTimeout(retryTimeout);
    } else if (redirectAttempts >= 3) {
      setRedirectError("Automatic redirect failed. Please click the button below.");
    }
    return undefined;
  }, [redirectAttempts, status]);

  const handleGoogleSignIn = async () => {
    try {
      await signIn("google", { 
        callbackUrl: "/dashboard",
        redirect: true 
      });
    } catch (error) {
      logger.error("❌ Sign in failed:", error);
      setRedirectError("Sign in failed. Please try again.");
    }
  };

  const handleManualRedirect = () => {
    window.location.href = "/dashboard";
  };

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Enhanced authenticated user handling with fallback
  if (status === "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <div className="max-w-md w-full space-y-6 text-center">
          <div>
            <Globe className="mx-auto h-12 w-12 text-primary mb-4" />
            {!redirectError ? (
              <>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {redirectAttempts === 0 
                    ? "Setting up your dashboard..." 
                    : `Redirecting to dashboard... (Attempt ${redirectAttempts}/3)`}
                </p>
                {session?.user && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Welcome back, {session.user.name || session.user.email}!
                  </p>
                )}
              </>
            ) : (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    <h3 className="font-medium text-orange-900">Redirect Issue</h3>
                  </div>
                  <p className="text-sm text-orange-700 mb-4">{redirectError}</p>
                  <div className="space-y-3">
                    <Button onClick={handleManualRedirect} className="w-full">
                      Go to Dashboard Manually
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => window.location.reload()} 
                      className="w-full"
                    >
                      Refresh Page
                    </Button>
                  </div>
                  {process.env.NODE_ENV === "development" && session && (
                    <details className="mt-4 text-left">
                      <summary className="text-xs text-orange-600 cursor-pointer">
                        Debug Info (Development)
                      </summary>
                      <pre className="text-xs mt-2 bg-orange-100 p-2 rounded overflow-auto">
                        {JSON.stringify({
                          userId: session.user?.id,
                          email: session.user?.email,
                          redirectAttempts,
                          status,
                        }, null, 2)}
                      </pre>
                    </details>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

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
              Sign in with your Google account to access your adventures
            </CardDescription>
          </CardHeader>
          <CardContent>
            <button
              type="button"
              className="w-full border rounded-md px-4 py-2 hover:bg-gray-50"
              onClick={handleGoogleSignIn}
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
            </button>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/signup"
                className="font-medium text-primary hover:underline"
              >
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
