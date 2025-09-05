"use client";

import { Globe, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const errorMessages: Record<string, string> = {
  Configuration: "There is a problem with the server configuration.",
  AccessDenied: "Access denied. You do not have permission to sign in.",
  Verification:
    "The sign in link is no longer valid. It may have been used already or it may have expired.",
  OAuthAccountNotLinked:
    "This email is already associated with another account. If you previously signed up with email and password, please use that method to sign in. You can then link your Google account in your profile settings.",
  Default: "An error occurred during authentication.",
};

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams?.get("error") || "Default";
  const errorMessage = errorMessages[error] || errorMessages.Default;

  return (
    <div className="space-y-4">
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>

      {error === "OAuthAccountNotLinked" && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            How to fix this:
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Try signing in with your email and password instead</li>
            <li>• Clear your browser cache and cookies, then try again</li>
            <li>
              • If you need help, contact support with error code: {error}
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50">
      <div className="max-w-md w-full space-y-8 p-6">
        <div className="text-center">
          <Globe className="mx-auto h-12 w-12 text-primary" />
          <h2 className="mt-6 text-3xl font-bold">Authentication Error</h2>
          <p className="mt-2 text-muted-foreground">
            Something went wrong during authentication
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span>Error</span>
            </CardTitle>
            <CardDescription>
              Please try again or contact support if the problem persists
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense
              fallback={
                <Alert variant="destructive" className="mb-6">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>Loading error details...</AlertDescription>
                </Alert>
              }
            >
              <ErrorContent />
            </Suspense>

            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link href="/auth/signin">Try Again</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
