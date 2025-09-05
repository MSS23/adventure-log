"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { Globe, User, AlertCircle, CheckCircle, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { logger } from "@/lib/logger";

export default function TestAuthPage() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch (error) {
      logger.error("Sign in error:", { error: error });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut({ callbackUrl: "/test-auth" });
    } catch (error) {
      logger.error("Sign out error:", { error: error });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "authenticated":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "unauthenticated":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "loading":
        return (
          <AlertCircle className="h-5 w-5 text-yellow-600 animate-pulse" />
        );
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-8">
          <Globe className="mx-auto h-12 w-12 text-primary mb-4" />
          <h1 className="text-3xl font-bold mb-2">OAuth Test Page</h1>
          <p className="text-muted-foreground">
            Test and debug Google OAuth authentication
          </p>
        </div>

        {/* Session Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getStatusIcon()}
              <span>Authentication Status</span>
            </CardTitle>
            <CardDescription>
              Current session state: <span className="font-mono">{status}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === "loading" && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Loading session information...
                </AlertDescription>
              </Alert>
            )}

            {status === "authenticated" && session && (
              <div className="space-y-3">
                <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    Successfully authenticated!
                  </AlertDescription>
                </Alert>

                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span className="font-semibold">User Information:</span>
                  </div>
                  <div className="ml-6 space-y-1 text-sm">
                    <p>
                      <strong>ID:</strong> {session.user?.id || "Not available"}
                    </p>
                    <p>
                      <strong>Name:</strong>{" "}
                      {session.user?.name || "Not provided"}
                    </p>
                    <p>
                      <strong>Email:</strong>{" "}
                      {session.user?.email || "Not provided"}
                    </p>
                    <p>
                      <strong>Image:</strong>{" "}
                      {session.user?.image ? "Provided" : "Not provided"}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleSignOut}
                  disabled={isLoading}
                  variant="destructive"
                  className="w-full"
                >
                  {isLoading ? "Signing out..." : "Sign Out"}
                </Button>
              </div>
            )}

            {status === "unauthenticated" && (
              <div className="space-y-4">
                <Alert className="border-red-200 bg-red-50 dark:bg-red-950">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800 dark:text-red-200">
                    Not authenticated. Please sign in to test.
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                  <span>
                    {isLoading ? "Signing in..." : "Sign in with Google"}
                  </span>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Debug Information */}
        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
            <CardDescription>
              OAuth configuration and environment details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                <h4 className="font-semibold mb-2">Environment</h4>
                <p className="text-sm">
                  <strong>Mode:</strong> {process.env.NODE_ENV || "unknown"}
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                <h4 className="font-semibold mb-2">Session</h4>
                <p className="text-sm">
                  <strong>Status:</strong> {status}
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                Testing Guidelines:
              </h4>
              <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                <li>• This page is for testing OAuth functionality</li>
                <li>• Check browser console for detailed error messages</li>
                <li>• Try signing in with different Google accounts</li>
                <li>• Test with incognito/private browsing mode</li>
                <li>• Clear cookies if experiencing issues</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" className="w-full">
              <a href="/auth/signin">Go to Sign In Page</a>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <a href="/dashboard">Go to Dashboard</a>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <a href="/api/debug/oauth-verify" target="_blank" rel="noopener">
                View OAuth Debug Info
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
