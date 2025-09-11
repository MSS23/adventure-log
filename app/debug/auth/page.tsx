"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/providers";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  TestTube,
  Upload,
  Database,
  Shield,
  Settings,
  User,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

interface DiagnosticResult {
  name: string;
  status: "success" | "error" | "warning";
  message: string;
  details?: any;
}

interface TestSuite {
  name: string;
  icon: React.ComponentType<any>;
  results: DiagnosticResult[];
  running: boolean;
}

export default function AuthDiagnosticPage() {
  const { user, session, loading, signIn, signOut } = useAuth();
  const supabase = createClient();
  const [showSensitive, setShowSensitive] = useState(false);
  const [testSuites, setTestSuites] = useState<Record<string, TestSuite>>({
    environment: {
      name: "Environment & Configuration",
      icon: Settings,
      results: [],
      running: false,
    },
    supabase: {
      name: "Supabase Authentication",
      icon: Shield,
      results: [],
      running: false,
    },
    api: {
      name: "API Authentication",
      icon: Database,
      results: [],
      running: false,
    },
    storage: {
      name: "Storage & Upload Tests",
      icon: Upload,
      results: [],
      running: false,
    },
  });

  const addTestResult = (
    suite: string,
    result: DiagnosticResult,
    replace = false
  ) => {
    setTestSuites((prev) => ({
      ...prev,
      [suite]: {
        ...prev[suite],
        results: replace
          ? [result]
          : [
              ...prev[suite].results.filter((r) => r.name !== result.name),
              result,
            ],
      },
    }));
  };

  const setTestSuiteRunning = (suite: string, running: boolean) => {
    setTestSuites((prev) => ({
      ...prev,
      [suite]: { ...prev[suite], running },
    }));
  };

  // Environment Tests
  const runEnvironmentTests = async () => {
    setTestSuiteRunning("environment", true);
    setTestSuites((prev) => ({
      ...prev,
      environment: { ...prev.environment, results: [] },
    }));

    // Check environment variables
    const requiredEnvVars = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "GOOGLE_CLIENT_ID",
    ];

    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar];
      addTestResult("environment", {
        name: envVar,
        status: value ? "success" : "error",
        message: value
          ? "Environment variable set"
          : "Environment variable missing",
        details: value
          ? { present: true, valueLength: value.length }
          : { present: false },
      });
    }

    // Check deprecated NextAuth variables
    const deprecatedVars = ["NEXTAUTH_URL", "NEXTAUTH_SECRET"];
    for (const envVar of deprecatedVars) {
      const value = process.env[envVar];
      if (value) {
        addTestResult("environment", {
          name: `${envVar} (Deprecated)`,
          status: "warning",
          message: "NextAuth variable still present - should be removed",
          details: { shouldRemove: true },
        });
      }
    }

    setTestSuiteRunning("environment", false);
  };

  // Supabase Auth Tests
  const runSupabaseTests = async () => {
    setTestSuiteRunning("supabase", true);
    setTestSuites((prev) => ({
      ...prev,
      supabase: { ...prev.supabase, results: [] },
    }));

    try {
      // Test Supabase client creation
      if (supabase) {
        addTestResult("supabase", {
          name: "Supabase Client",
          status: "success",
          message: "Supabase client created successfully",
        });

        // Check current session
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          addTestResult("supabase", {
            name: "Session Check",
            status: "error",
            message: `Session check failed: ${sessionError.message}`,
            details: { error: sessionError },
          });
        } else {
          addTestResult("supabase", {
            name: "Session Check",
            status: sessionData.session ? "success" : "warning",
            message: sessionData.session
              ? "Active Supabase session found"
              : "No active session",
            details: {
              hasSession: !!sessionData.session,
              userId: sessionData.session?.user?.id,
              email: sessionData.session?.user?.email,
            },
          });
        }

        // Test user data
        if (user) {
          addTestResult("supabase", {
            name: "User Data",
            status: "success",
            message: "User data available from auth context",
            details: {
              userId: user.id,
              email: user.email,
              confirmed: user.email_confirmed_at ? true : false,
            },
          });
        }
      } else {
        addTestResult("supabase", {
          name: "Supabase Client",
          status: "error",
          message: "Failed to create Supabase client",
        });
      }
    } catch (error: any) {
      addTestResult("supabase", {
        name: "Supabase Connection",
        status: "error",
        message: `Connection failed: ${error.message}`,
        details: { error },
      });
    }

    setTestSuiteRunning("supabase", false);
  };

  // API Tests
  const runAPITests = async () => {
    setTestSuiteRunning("api", true);
    setTestSuites((prev) => ({
      ...prev,
      api: { ...prev.api, results: [] },
    }));

    // Test health endpoint
    try {
      const healthResponse = await fetch("/api/health");
      addTestResult("api", {
        name: "Health Endpoint",
        status: healthResponse.ok ? "success" : "error",
        message: `Health endpoint returned ${healthResponse.status}`,
        details: {
          status: healthResponse.status,
          ok: healthResponse.ok,
        },
      });
    } catch (error: any) {
      addTestResult("api", {
        name: "Health Endpoint",
        status: "error",
        message: `Health endpoint failed: ${error.message}`,
      });
    }

    // Test debug auth endpoint
    try {
      const debugResponse = await fetch("/api/debug/auth");
      addTestResult("api", {
        name: "Debug Auth Endpoint",
        status: debugResponse.ok ? "success" : "error",
        message: `Debug auth endpoint returned ${debugResponse.status}`,
        details: {
          status: debugResponse.status,
          ok: debugResponse.ok,
        },
      });
    } catch (error: any) {
      addTestResult("api", {
        name: "Debug Auth Endpoint",
        status: "error",
        message: `Debug auth endpoint failed: ${error.message}`,
      });
    }

    setTestSuiteRunning("api", false);
  };

  // Storage Tests
  const runStorageTests = async () => {
    setTestSuiteRunning("storage", true);
    setTestSuites((prev) => ({
      ...prev,
      storage: { ...prev.storage, results: [] },
    }));

    try {
      if (!user?.id) {
        addTestResult("storage", {
          name: "Storage Auth Prerequisites",
          status: "error",
          message: "No authenticated user for storage testing",
        });
        return;
      }

      // Test storage connection
      const { data: buckets, error: bucketError } =
        await supabase.storage.listBuckets();

      if (bucketError) {
        addTestResult("storage", {
          name: "Storage Connection",
          status: "error",
          message: `Storage connection failed: ${bucketError.message}`,
          details: { error: bucketError },
        });
      } else {
        addTestResult("storage", {
          name: "Storage Connection",
          status: "success",
          message: `Connected to storage, found ${buckets.length} buckets`,
          details: {
            buckets: buckets.map((b) => b.name),
          },
        });
      }

      // Test adventure-photos bucket
      const bucketName = "adventure-photos";
      const bucket = buckets?.find((b) => b.name === bucketName);
      addTestResult("storage", {
        name: `${bucketName} Bucket`,
        status: bucket ? "success" : "error",
        message: bucket
          ? "Adventure photos bucket exists"
          : "Adventure photos bucket not found",
        details: { bucketExists: !!bucket },
      });
    } catch (error: any) {
      addTestResult("storage", {
        name: "Storage Tests",
        status: "error",
        message: `Storage tests failed: ${error.message}`,
        details: { error },
      });
    }

    setTestSuiteRunning("storage", false);
  };

  // Run all tests
  const runAllTests = useCallback(async () => {
    toast.info("Running comprehensive authentication diagnostics...");
    await Promise.all([
      runEnvironmentTests(),
      runSupabaseTests(),
      runAPITests(),
      runStorageTests(),
    ]);
    toast.success("All diagnostic tests completed!");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Test file upload
  const testFileUpload = async () => {
    if (!user?.id) {
      toast.error("Please sign in to test file upload");
      return;
    }

    try {
      const testFile = new File(["test content"], "test.txt", {
        type: "text/plain",
      });
      const fileName = `test-${Date.now()}.txt`;
      const filePath = `${user.id}/${fileName}`;

      const { error } = await supabase.storage
        .from("adventure-photos")
        .upload(filePath, testFile);

      if (error) {
        toast.error(`Upload failed: ${error.message}`);
      } else {
        toast.success("File uploaded successfully!");
        // Clean up test file
        await supabase.storage.from("adventure-photos").remove([filePath]);
      }
    } catch (error: any) {
      toast.error(`Upload test failed: ${error.message}`);
    }
  };

  // Force session refresh
  const forceSessionRefresh = async () => {
    try {
      const { error } = await supabase.auth.refreshSession();
      if (error) throw error;
      toast.success("Session refreshed successfully");
    } catch (error: any) {
      toast.error(`Failed to refresh session: ${error.message}`);
    }
  };

  // Clear all data
  const clearAllData = async () => {
    if (typeof window !== "undefined") {
      localStorage.clear();
      sessionStorage.clear();
      toast.success("Local storage cleared");
    }
  };

  // Auto-run tests on load
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loading) {
        runAllTests();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [loading, runAllTests]);

  const getStatusIcon = (status: DiagnosticResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: DiagnosticResult["status"]) => {
    switch (status) {
      case "success":
        return "default";
      case "warning":
        return "secondary";
      case "error":
        return "destructive";
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          🔍 Authentication Diagnostics
        </h1>
        <p className="text-muted-foreground mb-4">
          Comprehensive testing of Supabase authentication, Google OAuth, and
          API integration
        </p>

        <div className="flex flex-wrap gap-2 justify-center mb-6">
          <Badge
            variant={loading ? "secondary" : user ? "default" : "destructive"}
          >
            {loading
              ? "Loading..."
              : user
                ? `Signed in: ${user.email}`
                : "Not signed in"}
          </Badge>
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            {new Date().toLocaleString()}
          </Badge>
        </div>

        {/* Current Session Status */}
        {user && (
          <Alert className="mt-4">
            <User className="h-4 w-4" />
            <AlertDescription>
              <strong>Current User:</strong> {user.email}
              <span className="text-muted-foreground">
                {" "}
                (ID: {user.id.substring(0, 8)}...)
              </span>
            </AlertDescription>
          </Alert>
        )}

        {!user && !loading && (
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No active session. Please sign in to test authenticated features.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap gap-2 justify-center mb-6">
        <Button onClick={runAllTests} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Run All Tests
        </Button>

        {user ? (
          <>
            <Button variant="outline" onClick={forceSessionRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Session
            </Button>
            <Button variant="outline" onClick={testFileUpload}>
              <TestTube className="h-4 w-4 mr-2" />
              Test Upload
            </Button>
            <Button variant="outline" onClick={() => signOut()}>
              Sign Out
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={() => signIn()}>
            Sign In with Google
          </Button>
        )}

        <Button
          variant="outline"
          onClick={() => setShowSensitive(!showSensitive)}
        >
          {showSensitive ? (
            <EyeOff className="h-4 w-4 mr-2" />
          ) : (
            <Eye className="h-4 w-4 mr-2" />
          )}
          {showSensitive ? "Hide" : "Show"} Details
        </Button>

        <Button variant="outline" onClick={clearAllData}>
          Clear Local Data
        </Button>
      </div>

      {/* Test Results */}
      <Tabs defaultValue="environment" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          {Object.entries(testSuites).map(([key, suite]) => {
            const Icon = suite.icon;
            const errorCount = suite.results.filter(
              (r) => r.status === "error"
            ).length;
            const warningCount = suite.results.filter(
              (r) => r.status === "warning"
            ).length;

            return (
              <TabsTrigger
                key={key}
                value={key}
                className="flex items-center gap-2"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{suite.name}</span>
                <Badge
                  variant={
                    errorCount > 0
                      ? "destructive"
                      : warningCount > 0
                        ? "secondary"
                        : "default"
                  }
                  className="ml-1"
                >
                  {suite.results.length}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {Object.entries(testSuites).map(([key, suite]) => (
          <TabsContent key={key} value={key}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <suite.icon className="h-5 w-5" />
                    {suite.name}
                    {suite.running && (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    )}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {suite.results.length === 0 ? (
                  <p className="text-muted-foreground">No test results yet.</p>
                ) : (
                  suite.results.map((result, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg border"
                    >
                      {getStatusIcon(result.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{result.name}</span>
                          <Badge variant={getStatusColor(result.status)}>
                            {result.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {result.message}
                        </p>
                        {showSensitive && result.details && (
                          <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Session Debug Info */}
      {session && showSensitive && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Session Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-96">
              {JSON.stringify(
                {
                  session,
                  user,
                  timestamp: new Date().toISOString(),
                },
                null,
                2
              )}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
