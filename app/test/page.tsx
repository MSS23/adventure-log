"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TestResult {
  status: string;
  result: any;
  error: string | null;
}

interface ServiceTestResults {
  timestamp: string;
  tests: Record<string, TestResult>;
  summary: {
    passed: number;
    failed: number;
    total_tests: number;
    status: string;
    errors: string[];
    recommendations?: string[];
  };
}

interface EnvironmentDebug {
  timestamp: string;
  environment: string;
  clientEnvironment: Record<string, string>;
  serverEnvironment: Record<string, string>;
  missing: {
    client: string[];
    server: string[];
    total: number;
  };
  services: Record<string, any>;
  status: Record<string, boolean>;
  recommendations: string[];
}

export default function TestPage() {
  const [envData, setEnvData] = useState<EnvironmentDebug | null>(null);
  const [supabaseData, setSupabaseData] = useState<ServiceTestResults | null>(
    null
  );
  const [cloudinaryData, setCloudinaryData] =
    useState<ServiceTestResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch all diagnostic data
  const runAllTests = async () => {
    setLoading(true);
    try {
      // Fetch environment variables
      const envResponse = await fetch("/api/debug");
      const envResult = await envResponse.json();
      setEnvData(envResult);

      // Fetch Supabase diagnostics
      const supabaseResponse = await fetch("/api/debug/supabase");
      const supabaseResult = await supabaseResponse.json();
      setSupabaseData(supabaseResult);

      // Fetch Cloudinary diagnostics
      const cloudinaryResponse = await fetch("/api/debug/cloudinary");
      const cloudinaryResult = await cloudinaryResponse.json();
      setCloudinaryData(cloudinaryResult);
    } catch (error) {
      console.error("Error running diagnostics:", error);
    } finally {
      setLoading(false);
    }
  };

  // Run tests on component mount
  useEffect(() => {
    runAllTests();
  }, []);

  // Status icon component
  const StatusIcon = ({ status }: { status: string }) => {
    if (status.includes("PASS") || status.includes("HEALTHY")) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (status.includes("PARTIAL")) {
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    } else if (status.includes("FAIL") || status.includes("UNHEALTHY")) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    return <AlertCircle className="h-5 w-5 text-gray-500" />;
  };

  // Status badge component
  const StatusBadge = ({
    status,
    count,
  }: {
    status: string;
    count?: number;
  }) => {
    const variant =
      status.includes("PASS") || status.includes("HEALTHY")
        ? "default"
        : status.includes("PARTIAL")
          ? "secondary"
          : "destructive";

    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <StatusIcon status={status} />
        {status} {count !== undefined && `(${count})`}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-muted/50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">
            Adventure Log - Service Diagnostics
          </h1>
          <p className="text-muted-foreground text-lg">
            Comprehensive testing of all external services and configurations
          </p>
          <div className="flex justify-center gap-4">
            <Button
              onClick={runAllTests}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              {loading ? "Running Tests..." : "Refresh All Tests"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2"
            >
              {showDetails ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              {showDetails ? "Hide Details" : "Show Details"}
            </Button>
          </div>
        </div>

        {/* Overall Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Environment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <StatusIcon
                  status={envData?.status.overall ? "HEALTHY" : "UNHEALTHY"}
                />
                <span className="font-semibold">
                  {envData
                    ? envData.status.overall
                      ? "Configured"
                      : "Issues Found"
                    : "Loading..."}
                </span>
              </div>
              {envData && (
                <p className="text-sm text-muted-foreground mt-1">
                  {envData.missing.total} missing variables
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Supabase</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <StatusIcon
                  status={supabaseData?.summary.status || "UNKNOWN"}
                />
                <span className="font-semibold">
                  {supabaseData?.summary.status || "Loading..."}
                </span>
              </div>
              {supabaseData && (
                <p className="text-sm text-muted-foreground mt-1">
                  {supabaseData.summary.passed}/
                  {supabaseData.summary.total_tests} tests passed
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Cloudinary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <StatusIcon
                  status={cloudinaryData?.summary.status || "UNKNOWN"}
                />
                <span className="font-semibold">
                  {cloudinaryData?.summary.status || "Loading..."}
                </span>
              </div>
              {cloudinaryData && (
                <p className="text-sm text-muted-foreground mt-1">
                  {cloudinaryData.summary.passed}/
                  {cloudinaryData.summary.total_tests} tests passed
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Overall Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {envData && supabaseData && cloudinaryData ? (
                  <>
                    <StatusIcon
                      status={
                        envData.status.overall &&
                        supabaseData.summary.status.includes("HEALTHY") &&
                        cloudinaryData.summary.status.includes("HEALTHY")
                          ? "HEALTHY"
                          : "UNHEALTHY"
                      }
                    />
                    <span className="font-semibold">
                      {envData.status.overall &&
                      supabaseData.summary.status.includes("HEALTHY") &&
                      cloudinaryData.summary.status.includes("HEALTHY")
                        ? "All Systems Go"
                        : "Issues Detected"}
                    </span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span className="font-semibold">Testing...</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Results */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="environment">Environment</TabsTrigger>
            <TabsTrigger value="supabase">Supabase</TabsTrigger>
            <TabsTrigger value="cloudinary">Cloudinary</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Service Status Summary</CardTitle>
                <CardDescription>
                  Quick overview of all service configurations and connectivity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Recommendations */}
                {(envData?.recommendations?.length || 0) +
                  (supabaseData?.summary.recommendations?.length || 0) +
                  (cloudinaryData?.summary.recommendations?.length || 0) >
                  0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-semibold">Action Items:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {envData?.recommendations?.map((rec, i) => (
                            <li key={`env-${i}`}>{rec}</li>
                          ))}
                          {supabaseData?.summary.recommendations?.map(
                            (rec, i) => (
                              <li key={`supabase-${i}`}>{rec}</li>
                            )
                          )}
                          {cloudinaryData?.summary.recommendations?.map(
                            (rec, i) => (
                              <li key={`cloudinary-${i}`}>{rec}</li>
                            )
                          )}
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Service Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {envData?.services &&
                    Object.entries(envData.services).map(
                      ([service, config]) => (
                        <div key={service} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium capitalize">
                              {service}
                            </h4>
                            <StatusBadge
                              status={
                                envData.status[service]
                                  ? "✅ CONFIGURED"
                                  : "❌ MISSING"
                              }
                            />
                          </div>
                          {typeof config === "object" && (
                            <div className="text-sm text-muted-foreground">
                              {Object.entries(config).map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                  <span>{key}:</span>
                                  <StatusIcon
                                    status={value ? "PASS" : "FAIL"}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Environment Tab */}
          <TabsContent value="environment" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Environment Variables</CardTitle>
                <CardDescription>
                  Configuration status for all environment variables
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {envData && (
                  <>
                    {/* Missing Variables Alert */}
                    {envData.missing.total > 0 && (
                      <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>
                          <p className="font-semibold">
                            {envData.missing.total} missing environment
                            variables
                          </p>
                          <div className="mt-2 space-y-1">
                            {envData.missing.client.length > 0 && (
                              <p>
                                Client-side: {envData.missing.client.join(", ")}
                              </p>
                            )}
                            {envData.missing.server.length > 0 && (
                              <p>
                                Server-side: {envData.missing.server.join(", ")}
                              </p>
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {showDetails && (
                      <>
                        {/* Client Environment */}
                        <div>
                          <h4 className="font-semibold mb-2">
                            Client-side Variables (NEXT_PUBLIC_*)
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {Object.entries(envData.clientEnvironment).map(
                              ([key, value]) => (
                                <div
                                  key={key}
                                  className="flex items-center justify-between p-2 border rounded"
                                >
                                  <code className="text-sm">{key}</code>
                                  <span
                                    className={`text-xs ${value.includes("MISSING") ? "text-red-500" : "text-green-500"}`}
                                  >
                                    {value}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </div>

                        {/* Server Environment */}
                        <div>
                          <h4 className="font-semibold mb-2">
                            Server-side Variables
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {Object.entries(envData.serverEnvironment).map(
                              ([key, value]) => (
                                <div
                                  key={key}
                                  className="flex items-center justify-between p-2 border rounded"
                                >
                                  <code className="text-sm">{key}</code>
                                  <span
                                    className={`text-xs ${value.includes("MISSING") ? "text-red-500" : "text-green-500"}`}
                                  >
                                    {value}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Supabase Tab */}
          <TabsContent value="supabase" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Supabase Connection Tests</CardTitle>
                <CardDescription>
                  Detailed testing of Supabase configuration and connectivity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {supabaseData && (
                  <>
                    <div className="flex items-center gap-4">
                      <StatusBadge
                        status={supabaseData.summary.status}
                        count={supabaseData.summary.total_tests}
                      />
                      <span className="text-sm text-muted-foreground">
                        {supabaseData.summary.passed} passed,{" "}
                        {supabaseData.summary.failed} failed
                      </span>
                    </div>

                    {supabaseData.summary.errors.length > 0 && (
                      <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>
                          <p className="font-semibold">Test Failures:</p>
                          <ul className="list-disc list-inside text-sm mt-1">
                            {supabaseData.summary.errors.map((error, i) => (
                              <li key={i}>{error}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {showDetails && (
                      <div className="space-y-3">
                        {Object.entries(supabaseData.tests).map(
                          ([testName, testResult]) => (
                            <div
                              key={testName}
                              className="border rounded-lg p-4"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium">
                                  {testName.replace(/_/g, " ").toUpperCase()}
                                </h4>
                                <StatusBadge status={testResult.status} />
                              </div>
                              {testResult.error && (
                                <p className="text-sm text-red-600 mb-2">
                                  Error: {testResult.error}
                                </p>
                              )}
                              {testResult.result && (
                                <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                                  {JSON.stringify(testResult.result, null, 2)}
                                </pre>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cloudinary Tab */}
          <TabsContent value="cloudinary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cloudinary Connection Tests</CardTitle>
                <CardDescription>
                  Detailed testing of Cloudinary configuration and API
                  connectivity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {cloudinaryData && (
                  <>
                    <div className="flex items-center gap-4">
                      <StatusBadge
                        status={cloudinaryData.summary.status}
                        count={cloudinaryData.summary.total_tests}
                      />
                      <span className="text-sm text-muted-foreground">
                        {cloudinaryData.summary.passed} passed,{" "}
                        {cloudinaryData.summary.failed} failed
                      </span>
                    </div>

                    {cloudinaryData.summary.errors.length > 0 && (
                      <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>
                          <p className="font-semibold">Test Failures:</p>
                          <ul className="list-disc list-inside text-sm mt-1">
                            {cloudinaryData.summary.errors.map((error, i) => (
                              <li key={i}>{error}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {showDetails && (
                      <div className="space-y-3">
                        {Object.entries(cloudinaryData.tests).map(
                          ([testName, testResult]) => (
                            <div
                              key={testName}
                              className="border rounded-lg p-4"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium">
                                  {testName.replace(/_/g, " ").toUpperCase()}
                                </h4>
                                <StatusBadge status={testResult.status} />
                              </div>
                              {testResult.error && (
                                <p className="text-sm text-red-600 mb-2">
                                  Error: {testResult.error}
                                </p>
                              )}
                              {testResult.result && (
                                <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                                  {JSON.stringify(testResult.result, null, 2)}
                                </pre>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Last updated:{" "}
            {envData?.timestamp
              ? new Date(envData.timestamp).toLocaleString()
              : "Never"}
          </p>
          <p>Adventure Log Service Diagnostics v1.0</p>
        </div>
      </div>
    </div>
  );
}
