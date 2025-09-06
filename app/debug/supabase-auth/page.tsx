"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/providers";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface TestResult {
  name: string;
  status: "success" | "error" | "warning" | "pending";
  message: string;
  details?: any;
}

export default function SupabaseAuthDebugPage() {
  const { user, session, loading, signIn, signOut, refreshSession } = useAuth();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [runningTests, setRunningTests] = useState(false);

  const supabase = createClient();

  const runDiagnosticTests = useCallback(async () => {
    setRunningTests(true);
    const results: TestResult[] = [];

    try {
      // Test 1: Supabase Client Initialization
      results.push({
        name: "Supabase Client",
        status: supabase ? "success" : "error",
        message: supabase
          ? "Client initialized successfully"
          : "Failed to initialize client",
        details: {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        },
      });

      // Test 2: Environment Variables
      const envVars = {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY:
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + "...",
        NEXT_PUBLIC_SUPABASE_BUCKET: process.env.NEXT_PUBLIC_SUPABASE_BUCKET,
      };

      results.push({
        name: "Environment Variables",
        status:
          envVars.NEXT_PUBLIC_SUPABASE_URL &&
          envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
            ? "success"
            : "error",
        message: "Environment variables check",
        details: envVars,
      });

      // Test 3: Session Status
      results.push({
        name: "Auth Session",
        status: user ? "success" : "warning",
        message: user ? `Authenticated as ${user.email}` : "No active session",
        details: {
          userId: user?.id,
          email: user?.email,
          sessionExpiry: session?.expires_at,
          accessTokenPresent: !!session?.access_token,
        },
      });

      if (user && session) {
        // Test 4: Database Connection
        try {
          const { data, error } = await supabase
            .from("photos")
            .select("count(*)")
            .limit(1);

          results.push({
            name: "Database Connection",
            status: error ? "error" : "success",
            message: error
              ? `Database error: ${error.message}`
              : "Database connection successful",
            details: { data, error },
          });
        } catch (dbError) {
          results.push({
            name: "Database Connection",
            status: "error",
            message: "Database connection failed",
            details: { error: dbError },
          });
        }

        // Test 5: Storage Bucket Access
        try {
          const { data: buckets, error: bucketError } =
            await supabase.storage.listBuckets();

          const adventureBucket = buckets?.find(
            (b) => b.id === "adventure-photos"
          );

          results.push({
            name: "Storage Bucket Access",
            status: bucketError
              ? "error"
              : adventureBucket
                ? "success"
                : "warning",
            message: bucketError
              ? `Bucket access error: ${bucketError.message}`
              : adventureBucket
                ? "adventure-photos bucket found"
                : "adventure-photos bucket not found",
            details: { buckets, adventureBucket },
          });

          // Test 6: User Folder Access
          if (adventureBucket) {
            const { data: files, error: listError } = await supabase.storage
              .from("adventure-photos")
              .list(user.id, { limit: 1 });

            results.push({
              name: "User Folder Access",
              status: listError ? "error" : "success",
              message: listError
                ? `Folder access error: ${listError.message}`
                : `User folder accessible (${files?.length || 0} files)`,
              details: { files, listError, userFolder: user.id },
            });
          }
        } catch (storageError) {
          results.push({
            name: "Storage Access",
            status: "error",
            message: "Storage access failed",
            details: { error: storageError },
          });
        }

        // Test 7: API Route Test
        try {
          const response = await fetch("/api/debug/auth-test", {
            method: "GET",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          });

          const apiData = await response.json();

          results.push({
            name: "API Route Authentication",
            status: response.ok ? "success" : "error",
            message: response.ok
              ? "API route authentication successful"
              : `API route error: ${apiData.error || response.statusText}`,
            details: { status: response.status, data: apiData },
          });
        } catch (apiError) {
          results.push({
            name: "API Route Authentication",
            status: "error",
            message: "API route test failed",
            details: { error: apiError },
          });
        }

        // Test 8: Token Refresh Test
        try {
          const { data: refreshData, error: refreshError } =
            await supabase.auth.refreshSession();

          results.push({
            name: "Token Refresh",
            status: refreshError ? "error" : "success",
            message: refreshError
              ? `Token refresh error: ${refreshError.message}`
              : "Token refresh successful",
            details: { refreshData, refreshError },
          });
        } catch (refreshTestError) {
          results.push({
            name: "Token Refresh",
            status: "error",
            message: "Token refresh test failed",
            details: { error: refreshTestError },
          });
        }
      }
    } catch (error) {
      results.push({
        name: "Test Suite",
        status: "error",
        message: "Diagnostic test suite failed",
        details: { error },
      });
    }

    setTestResults(results);
    setRunningTests(false);
  }, [user, session, supabase]);

  useEffect(() => {
    // Run tests automatically when component mounts and user changes
    if (!loading) {
      runDiagnosticTests();
    }
  }, [user, loading, runDiagnosticTests]);

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "pending":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: TestResult["status"]) => {
    switch (status) {
      case "success":
        return "bg-green-50 border-green-200";
      case "error":
        return "bg-red-50 border-red-200";
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      case "pending":
        return "bg-blue-50 border-blue-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Supabase Auth Diagnostics</h1>
            <p className="text-muted-foreground">
              Comprehensive authentication and storage testing panel
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={runDiagnosticTests}
              disabled={runningTests}
              variant="outline"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${runningTests ? "animate-spin" : ""}`}
              />
              {runningTests ? "Running Tests..." : "Refresh Tests"}
            </Button>
            {user && (
              <Button onClick={refreshSession} variant="outline">
                Refresh Session
              </Button>
            )}
          </div>
        </div>

        {/* Authentication Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Authentication Status
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : user ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading authentication state...</span>
              </div>
            ) : user ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default">Authenticated</Badge>
                  <span>Signed in as {user.email}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>User ID: {user.id}</p>
                  <p>
                    Created: {new Date(user.created_at || "").toLocaleString()}
                  </p>
                  {session?.expires_at && (
                    <p>
                      Session Expires:{" "}
                      {new Date(session.expires_at * 1000).toLocaleString()}
                    </p>
                  )}
                </div>
                <Button onClick={signOut} variant="outline" size="sm">
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">Not Authenticated</Badge>
                  <span>Please sign in to run full diagnostics</span>
                </div>
                <Button onClick={() => signIn()} size="sm">
                  Sign In with Google
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card>
          <CardHeader>
            <CardTitle>Diagnostic Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            {testResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {runningTests ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Running diagnostic tests...</span>
                  </div>
                ) : (
                  <span>
                    No test results yet. Click &quot;Refresh Tests&quot; to
                    start diagnostics.
                  </span>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 ${getStatusColor(result.status)}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.status)}
                        <h3 className="font-medium">{result.name}</h3>
                        <Badge
                          variant={
                            result.status === "success"
                              ? "default"
                              : result.status === "error"
                                ? "destructive"
                                : result.status === "warning"
                                  ? "secondary"
                                  : "outline"
                          }
                        >
                          {result.status}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm mb-2">{result.message}</p>
                    {result.details && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          View Details
                        </summary>
                        <pre className="mt-2 p-2 bg-white/50 rounded border overflow-auto max-h-40">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                onClick={() => (window.location.href = "/albums")}
                variant="outline"
                className="h-20 flex-col"
              >
                Test Albums
                <span className="text-xs text-muted-foreground">
                  Check album loading
                </span>
              </Button>
              <Button
                onClick={() => (window.location.href = "/debug/auth")}
                variant="outline"
                className="h-20 flex-col"
              >
                NextAuth Debug
                <span className="text-xs text-muted-foreground">
                  Compare with old system
                </span>
              </Button>
              <Button
                onClick={() =>
                  window.open(
                    "https://supabase.com/dashboard/project/izjbtlpcpxlnndofudti",
                    "_blank"
                  )
                }
                variant="outline"
                className="h-20 flex-col"
              >
                Supabase Dashboard
                <span className="text-xs text-muted-foreground">
                  Open project console
                </span>
              </Button>
              <Button
                onClick={runDiagnosticTests}
                disabled={runningTests}
                className="h-20 flex-col"
              >
                {runningTests ? (
                  <Loader2 className="h-4 w-4 animate-spin mb-1" />
                ) : null}
                Run Tests
                <span className="text-xs text-muted-foreground">
                  Refresh diagnostics
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        {testResults.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Test Summary:{" "}
              {testResults.filter((r) => r.status === "success").length} passed,{" "}
              {testResults.filter((r) => r.status === "error").length} failed,{" "}
              {testResults.filter((r) => r.status === "warning").length}{" "}
              warnings
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
