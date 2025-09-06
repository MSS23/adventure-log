"use client";

import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useAuth } from "@/app/providers";
import { supabase } from "@/lib/supabase";
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
  const { data: session, status, update } = useSession();
  const { user: supabaseUser } = useAuth();
  const [showSensitive, setShowSensitive] = useState(false);
  const [testSuites, setTestSuites] = useState<Record<string, TestSuite>>({
    environment: {
      name: "Environment & Configuration",
      icon: Settings,
      results: [],
      running: false,
    },
    nextauth: {
      name: "NextAuth Session Analysis",
      icon: User,
      results: [],
      running: false,
    },
    supabase: {
      name: "Supabase Integration",
      icon: Database,
      results: [],
      running: false,
    },
    api: {
      name: "API Endpoint Testing",
      icon: TestTube,
      results: [],
      running: false,
    },
    storage: {
      name: "Storage Authentication",
      icon: Upload,
      results: [],
      running: false,
    },
  });

  const [overallStatus, setOverallStatus] = useState<{
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  }>({ total: 0, passed: 0, failed: 0, warnings: 0 });

  // Update overall status when test results change
  useEffect(() => {
    const allResults = Object.values(testSuites).flatMap(
      (suite) => suite.results
    );
    const total = allResults.length;
    const passed = allResults.filter((r) => r.status === "success").length;
    const failed = allResults.filter((r) => r.status === "error").length;
    const warnings = allResults.filter((r) => r.status === "warning").length;

    setOverallStatus({ total, passed, failed, warnings });
  }, [testSuites]);

  const updateTestSuite = (suiteKey: string, updates: Partial<TestSuite>) => {
    setTestSuites((prev) => ({
      ...prev,
      [suiteKey]: { ...prev[suiteKey], ...updates },
    }));
  };

  const addTestResult = (suiteKey: string, result: DiagnosticResult) => {
    setTestSuites((prev) => ({
      ...prev,
      [suiteKey]: {
        ...prev[suiteKey],
        results: [...prev[suiteKey].results, result],
      },
    }));
  };

  const clearTestResults = (suiteKey: string) => {
    setTestSuites((prev) => ({
      ...prev,
      [suiteKey]: {
        ...prev[suiteKey],
        results: [],
      },
    }));
  };

  // Environment Configuration Tests
  const testEnvironmentConfiguration = async () => {
    clearTestResults("environment");
    updateTestSuite("environment", { running: true });

    try {
      // Check required environment variables
      const requiredEnvVars = [
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "NEXT_PUBLIC_SUPABASE_BUCKET",
      ];

      for (const envVar of requiredEnvVars) {
        const value = process.env[envVar];
        if (value) {
          addTestResult("environment", {
            name: `${envVar}`,
            status: "success",
            message: "Environment variable is set",
            details: {
              length: value.length,
              preview: showSensitive ? value : value.substring(0, 20) + "...",
            },
          });
        } else {
          addTestResult("environment", {
            name: `${envVar}`,
            status: "error",
            message: "Environment variable is missing",
          });
        }
      }

      // Check Supabase URL format
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (supabaseUrl) {
        try {
          new URL(supabaseUrl);
          const isSupabaseUrl = supabaseUrl.includes("supabase.co");
          addTestResult("environment", {
            name: "Supabase URL Format",
            status: isSupabaseUrl ? "success" : "warning",
            message: isSupabaseUrl
              ? "Valid Supabase URL"
              : "URL doesn't appear to be a standard Supabase URL",
            details: { url: supabaseUrl },
          });
        } catch {
          addTestResult("environment", {
            name: "Supabase URL Format",
            status: "error",
            message: "Invalid URL format",
          });
        }
      }

      // Test NextAuth configuration
      if (typeof window !== "undefined") {
        const nextAuthUrl = window.location.origin;
        addTestResult("environment", {
          name: "NextAuth Base URL",
          status: "success",
          message: "NextAuth URL detected",
          details: { url: nextAuthUrl },
        });
      }
    } catch (error) {
      addTestResult("environment", {
        name: "Environment Test",
        status: "error",
        message: `Test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      updateTestSuite("environment", { running: false });
    }
  };

  // NextAuth Session Analysis
  const testNextAuthSession = async () => {
    clearTestResults("nextauth");
    updateTestSuite("nextauth", { running: true });

    try {
      // Session status
      addTestResult("nextauth", {
        name: "Session Status",
        status:
          status === "authenticated"
            ? "success"
            : status === "loading"
              ? "warning"
              : "error",
        message: `Session status: ${status}`,
        details: { status },
      });

      // Session data analysis
      if (session) {
        addTestResult("nextauth", {
          name: "User Data",
          status: "success",
          message: "User session data available",
          details: {
            userId: (session.user as any)?.id,
            email: session.user?.email,
            name: session.user?.name,
            image: session.user?.image,
            hasToken: !!(session as any).accessToken,
          },
        });

        // Session expiry
        if (session.expires) {
          const expiryTime = new Date(session.expires);
          const timeUntilExpiry = expiryTime.getTime() - Date.now();
          const hoursUntilExpiry = Math.round(
            timeUntilExpiry / (1000 * 60 * 60)
          );

          addTestResult("nextauth", {
            name: "Session Expiry",
            status: hoursUntilExpiry > 1 ? "success" : "warning",
            message: `Session expires in ${hoursUntilExpiry} hours`,
            details: {
              expires: session.expires,
              hoursRemaining: hoursUntilExpiry,
            },
          });
        }

        // Check for required user fields
        const requiredFields = ["id", "email"];
        for (const field of requiredFields) {
          const value = session.user?.[field as keyof typeof session.user];
          addTestResult("nextauth", {
            name: `User ${field}`,
            status: value ? "success" : "error",
            message: value ? `${field} is present` : `${field} is missing`,
            details: { [field]: value },
          });
        }
      } else {
        addTestResult("nextauth", {
          name: "Session Data",
          status: "error",
          message: "No session data available",
        });
      }

      // Check browser storage
      if (typeof window !== "undefined") {
        const sessionCookie = document.cookie.includes(
          "next-auth.session-token"
        );
        addTestResult("nextauth", {
          name: "Session Cookie",
          status: sessionCookie ? "success" : "warning",
          message: sessionCookie
            ? "Session cookie found"
            : "No session cookie detected",
        });

        // Check localStorage for any auth-related data
        const authKeys = Object.keys(localStorage).filter(
          (key) => key.includes("auth") || key.includes("session")
        );
        addTestResult("nextauth", {
          name: "LocalStorage Auth Data",
          status: authKeys.length > 0 ? "success" : "warning",
          message: `Found ${authKeys.length} auth-related localStorage keys`,
          details: { keys: authKeys },
        });
      }
    } catch (error) {
      addTestResult("nextauth", {
        name: "NextAuth Test",
        status: "error",
        message: `Test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      updateTestSuite("nextauth", { running: false });
    }
  };

  // Supabase Integration Tests
  const testSupabaseIntegration = async () => {
    clearTestResults("supabase");
    updateTestSuite("supabase", { running: true });

    try {
      // Supabase client initialization
      addTestResult("supabase", {
        name: "Client Initialization",
        status: supabase ? "success" : "error",
        message: supabase
          ? "Supabase client initialized"
          : "Supabase client not available",
      });

      if (supabase) {
        // Check Supabase session
        const { data: supabaseSession, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          addTestResult("supabase", {
            name: "Supabase Session Check",
            status: "error",
            message: `Session check failed: ${sessionError.message}`,
            details: { error: sessionError },
          });
        } else {
          addTestResult("supabase", {
            name: "Supabase Session Check",
            status: supabaseSession.session ? "success" : "warning",
            message: supabaseSession.session
              ? "Supabase session active"
              : "No Supabase session (using NextAuth instead)",
            details: {
              hasSession: !!supabaseSession.session,
              userId: supabaseSession.session?.user?.id,
            },
          });
        }

        // Test Supabase connection
        try {
          const { error: connectionError } = await supabase
            .from("Album") // Assuming you have an Album table
            .select("count")
            .limit(1);

          if (connectionError) {
            // This might be expected if using NextAuth instead of Supabase auth
            addTestResult("supabase", {
              name: "Database Connection",
              status: connectionError.code === "PGRST301" ? "warning" : "error",
              message:
                connectionError.code === "PGRST301"
                  ? "Database accessible but RLS blocking (expected with NextAuth)"
                  : `Connection error: ${connectionError.message}`,
              details: { error: connectionError },
            });
          } else {
            addTestResult("supabase", {
              name: "Database Connection",
              status: "success",
              message: "Database connection successful",
            });
          }
        } catch (dbError) {
          addTestResult("supabase", {
            name: "Database Connection",
            status: "error",
            message: `Database test failed: ${dbError instanceof Error ? dbError.message : "Unknown error"}`,
          });
        }

        // Test storage bucket access
        try {
          const { data: buckets, error: bucketError } =
            await supabase.storage.listBuckets();

          if (bucketError) {
            addTestResult("supabase", {
              name: "Storage Bucket Access",
              status: "error",
              message: `Bucket access failed: ${bucketError.message}`,
              details: { error: bucketError },
            });
          } else {
            const adventureBucket = buckets?.find(
              (b) => b.name === "adventure-photos"
            );
            addTestResult("supabase", {
              name: "Storage Bucket Access",
              status: adventureBucket ? "success" : "warning",
              message: adventureBucket
                ? "adventure-photos bucket found"
                : `${buckets?.length || 0} buckets found, but no adventure-photos bucket`,
              details: { buckets: buckets?.map((b) => b.name) },
            });
          }
        } catch (storageError) {
          addTestResult("supabase", {
            name: "Storage Bucket Access",
            status: "error",
            message: `Storage test failed: ${storageError instanceof Error ? storageError.message : "Unknown error"}`,
          });
        }
      }
    } catch (error) {
      addTestResult("supabase", {
        name: "Supabase Integration Test",
        status: "error",
        message: `Test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      updateTestSuite("supabase", { running: false });
    }
  };

  // API Endpoint Testing
  const testAPIEndpoints = async () => {
    clearTestResults("api");
    updateTestSuite("api", { running: true });

    try {
      // Test albums API
      try {
        const albumsResponse = await fetch("/api/albums?limit=1", {
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        addTestResult("api", {
          name: "Albums API (/api/albums)",
          status: albumsResponse.ok ? "success" : "error",
          message: albumsResponse.ok
            ? `Albums API accessible (${albumsResponse.status})`
            : `Albums API failed (${albumsResponse.status} ${albumsResponse.statusText})`,
          details: {
            status: albumsResponse.status,
            statusText: albumsResponse.statusText,
            url: "/api/albums",
          },
        });

        if (!albumsResponse.ok) {
          const errorData = await albumsResponse.json().catch(() => ({}));
          addTestResult("api", {
            name: "Albums API Error Details",
            status: "error",
            message: errorData.error || "Unknown error",
            details: errorData,
          });
        }
      } catch (albumError) {
        addTestResult("api", {
          name: "Albums API (/api/albums)",
          status: "error",
          message: `Request failed: ${albumError instanceof Error ? albumError.message : "Unknown error"}`,
        });
      }

      // Test auth status endpoint (if exists)
      try {
        const authResponse = await fetch("/api/auth/session", {
          credentials: "include",
        });

        if (authResponse.ok) {
          const authData = await authResponse.json();
          addTestResult("api", {
            name: "Auth Session API",
            status: "success",
            message: "Session API accessible",
            details: {
              hasUser: !!authData?.user,
              userId: authData?.user?.id,
            },
          });
        } else {
          addTestResult("api", {
            name: "Auth Session API",
            status: "warning",
            message: `Session API returned ${authResponse.status}`,
          });
        }
      } catch (authError) {
        addTestResult("api", {
          name: "Auth Session API",
          status: "warning",
          message: "Session API not accessible or doesn't exist",
        });
      }
    } catch (error) {
      addTestResult("api", {
        name: "API Testing",
        status: "error",
        message: `Test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      updateTestSuite("api", { running: false });
    }
  };

  // Storage Authentication Test
  const testStorageAuthentication = async () => {
    clearTestResults("storage");
    updateTestSuite("storage", { running: true });

    try {
      if (!supabaseUser?.id && !(session?.user as any)?.id) {
        addTestResult("storage", {
          name: "Storage Auth Prerequisites",
          status: "error",
          message:
            "No authenticated user session for storage testing (neither Supabase nor NextAuth)",
        });
        return;
      }

      // Test storage debug endpoint
      try {
        const debugResponse = await fetch("/api/storage/debug", {
          credentials: "include",
        });

        if (debugResponse.ok) {
          const debugData = await debugResponse.json();
          addTestResult("storage", {
            name: "Storage Debug Endpoint",
            status:
              debugData.summary?.overallStatus === "HEALTHY"
                ? "success"
                : "warning",
            message: `Debug endpoint: ${debugData.summary?.testsPassed}/${debugData.summary?.testsRun} tests passed`,
            details: {
              summary: debugData.summary,
              testsRun: debugData.summary?.testsRun,
            },
          });

          // Analyze specific debug results
          if (debugData.tests) {
            debugData.tests.forEach((test: any) => {
              addTestResult("storage", {
                name: `Storage: ${test.name}`,
                status:
                  test.status === "PASSED"
                    ? "success"
                    : test.status === "FAILED"
                      ? "error"
                      : "warning",
                message:
                  test.result?.error?.message || `${test.name} test completed`,
                details: test.result,
              });
            });
          }
        } else {
          addTestResult("storage", {
            name: "Storage Debug Endpoint",
            status: "error",
            message: `Debug endpoint failed (${debugResponse.status})`,
          });
        }
      } catch (debugError) {
        addTestResult("storage", {
          name: "Storage Debug Endpoint",
          status: "error",
          message: `Debug endpoint error: ${debugError instanceof Error ? debugError.message : "Unknown error"}`,
        });
      }
    } catch (error) {
      addTestResult("storage", {
        name: "Storage Authentication Test",
        status: "error",
        message: `Test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      updateTestSuite("storage", { running: false });
    }
  };

  // Run all tests
  const runAllTests = async () => {
    toast.info("Running comprehensive authentication diagnostics...");

    await Promise.all([
      testEnvironmentConfiguration(),
      testNextAuthSession(),
      testSupabaseIntegration(),
      testAPIEndpoints(),
      testStorageAuthentication(),
    ]);

    toast.success("Diagnostic tests completed!");
  };

  // Test file upload
  const testFileUpload = async () => {
    if (!supabaseUser?.id && !(session?.user as any)?.id) {
      toast.error("Please sign in to test file upload");
      return;
    }

    // Create a small test file
    const testFile = new File(["test content"], "test.txt", {
      type: "text/plain",
    });
    const formData = new FormData();
    formData.append("file", testFile);
    formData.append("albumId", "test-album");

    try {
      const response = await fetch("/api/storage/debug", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(
          result.success ? "Upload test passed!" : "Upload test revealed issues"
        );
        console.log("Upload test result:", result);
      } else {
        toast.error(
          `Upload test failed: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      toast.error(
        `Upload test error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  };

  // Force session refresh
  const forceSessionRefresh = async () => {
    try {
      await update();
      toast.success("Session refreshed successfully");
    } catch (error) {
      toast.error("Failed to refresh session");
    }
  };

  // Clear browser data
  const clearBrowserData = () => {
    if (typeof window !== "undefined") {
      localStorage.clear();
      sessionStorage.clear();

      // Clear cookies (limited by same-origin policy)
      document.cookie.split(";").forEach(function (c) {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      toast.success("Browser data cleared. Please refresh the page.");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      success: "default",
      error: "destructive",
      warning: "secondary",
    } as const;
    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          🔍 Authentication Diagnostics
        </h1>
        <p className="text-muted-foreground mb-4">
          Comprehensive testing of Google OAuth, NextAuth sessions, Supabase
          integration, and API authentication
        </p>

        {/* Overall Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Overall Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {overallStatus.total}
                </div>
                <div className="text-sm text-muted-foreground">Total Tests</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {overallStatus.passed}
                </div>
                <div className="text-sm text-muted-foreground">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {overallStatus.failed}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {overallStatus.warnings}
                </div>
                <div className="text-sm text-muted-foreground">Warnings</div>
              </div>
            </div>

            {/* Current Session Status */}
            {session && (
              <Alert className="mt-4">
                <User className="h-4 w-4" />
                <AlertDescription>
                  <strong>Current User:</strong>{" "}
                  {session.user?.name || session.user?.email}
                  {(session.user as any)?.id && (
                    <span className="text-muted-foreground">
                      {" "}
                      (ID: {(session.user as any).id.substring(0, 8)}...)
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {!session && status !== "loading" && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No active session. Please sign in to test authenticated
                  features.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Control Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button onClick={runAllTests}>
            <TestTube className="h-4 w-4 mr-2" />
            Run All Tests
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowSensitive(!showSensitive)}
          >
            {showSensitive ? (
              <EyeOff className="h-4 w-4 mr-2" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            {showSensitive ? "Hide" : "Show"} Sensitive Data
          </Button>

          {session ? (
            <>
              <Button variant="outline" onClick={forceSessionRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Session
              </Button>
              <Button variant="outline" onClick={testFileUpload}>
                <Upload className="h-4 w-4 mr-2" />
                Test Upload
              </Button>
              <Button variant="outline" onClick={() => signOut()}>
                Sign Out
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => signIn("google")}>
              Sign In with Google
            </Button>
          )}

          <Button variant="destructive" size="sm" onClick={clearBrowserData}>
            Clear Browser Data
          </Button>
        </div>
      </div>

      {/* Test Results */}
      <Tabs defaultValue="environment" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          {Object.entries(testSuites).map(([key, suite]) => {
            const Icon = suite.icon;
            const hasErrors = suite.results.some((r) => r.status === "error");
            const hasWarnings = suite.results.some(
              (r) => r.status === "warning"
            );
            const allPassed =
              suite.results.length > 0 &&
              suite.results.every((r) => r.status === "success");

            return (
              <TabsTrigger
                key={key}
                value={key}
                className="flex items-center gap-1 text-xs"
              >
                <Icon className="h-3 w-3" />
                <span className="hidden sm:inline">{suite.name}</span>
                {suite.running && (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                )}
                {!suite.running && hasErrors && (
                  <XCircle className="h-3 w-3 text-red-500" />
                )}
                {!suite.running && !hasErrors && hasWarnings && (
                  <AlertCircle className="h-3 w-3 text-yellow-500" />
                )}
                {!suite.running && allPassed && (
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {Object.entries(testSuites).map(([key, suite]) => (
          <TabsContent key={key} value={key}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <suite.icon className="h-5 w-5" />
                    {suite.name}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      switch (key) {
                        case "environment":
                          testEnvironmentConfiguration();
                          break;
                        case "nextauth":
                          testNextAuthSession();
                          break;
                        case "supabase":
                          testSupabaseIntegration();
                          break;
                        case "api":
                          testAPIEndpoints();
                          break;
                        case "storage":
                          testStorageAuthentication();
                          break;
                      }
                    }}
                    disabled={suite.running}
                  >
                    {suite.running ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    {suite.running ? "Running..." : "Run Tests"}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {suite.results.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No test results yet. Click &quot;Run Tests&quot; to start
                    diagnostics.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {suite.results.map((result, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(result.status)}
                            <span className="font-medium">{result.name}</span>
                          </div>
                          {getStatusBadge(result.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {result.message}
                        </p>

                        {result.details && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                              Show Details
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
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
          </TabsContent>
        ))}
      </Tabs>

      {/* Session Debug Info */}
      {session && showSensitive && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Raw Session Data (Sensitive)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded overflow-x-auto">
              {JSON.stringify(
                {
                  session,
                  status,
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
