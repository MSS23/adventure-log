import { z } from "zod";

/**
 * Environment variable validation schema using Zod
 * This ensures all required environment variables are present and valid
 * at runtime, failing fast if any are missing or invalid.
 */

// Server-side environment variables schema
const serverEnvSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SHADOW_DATABASE_URL: z.string().optional(),

  // Authentication
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),

  // OAuth Providers
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),

  // Supabase (Server-side)
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),

  // Application
  APP_URL: z.string().url("APP_URL must be a valid URL").optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Optional integrations
  SLACK_WEBHOOK_URL: z.string().url("SLACK_WEBHOOK_URL must be a valid URL").optional(),
  SENTRY_DSN: z.string().url("SENTRY_DSN must be a valid URL").optional(),

  // Testing
  PLAYWRIGHT_BASE_URL: z.string().url("PLAYWRIGHT_BASE_URL must be a valid URL").optional(),
  CI: z.string().optional(),
});

// Client-side environment variables schema (must be prefixed with NEXT_PUBLIC_)
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  NEXT_PUBLIC_SUPABASE_BUCKET: z.string().min(1, "NEXT_PUBLIC_SUPABASE_BUCKET is required"),
  NEXT_PUBLIC_IS_MOBILE: z.string().optional(),
  NEXT_PUBLIC_PWA_ENABLED: z.string().optional(),
});

/**
 * Parse and validate server-side environment variables
 * This runs on the server and has access to all environment variables
 */
function parseServerEnv() {
  try {
    return serverEnvSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Invalid server environment variables:");
      error.issues.forEach((issue) => {
        console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Parse and validate client-side environment variables
 * This runs on both server and client and only has access to NEXT_PUBLIC_ vars
 */
function parseClientEnv() {
  try {
    return clientEnvSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Invalid client environment variables:");
      error.issues.forEach((issue) => {
        console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
      });
      if (typeof window === "undefined") {
        // On server, exit process
        process.exit(1);
      } else {
        // On client, throw error to be caught by error boundary
        throw new Error("Invalid client environment variables");
      }
    }
    throw error;
  }
}

// Type definitions for environment variables
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

/**
 * Validated environment variables
 * This combines client and server env, but server env is only available server-side
 */
export const env = typeof window === "undefined" 
  ? { ...parseClientEnv(), ...parseServerEnv() } as ClientEnv & ServerEnv
  : parseClientEnv() as ClientEnv;

/**
 * Server-only environment variables
 * Use this in API routes and server components where you need server-only vars
 */
export const serverEnv = typeof window === "undefined" ? parseServerEnv() : ({} as ServerEnv);

/**
 * Client-only environment variables
 * Use this in client components where you only need public vars
 */
export const clientEnv = parseClientEnv();

// Validate environment on module load in development (server-side only)
if (typeof window === "undefined" && process.env.NODE_ENV === "development") {
  console.log("✅ Environment variables validated successfully");
  
  // Log non-sensitive info in development
  const serverData = serverEnv;
  const clientData = clientEnv;
  console.log(`📝 Environment: ${serverData.NODE_ENV}`);
  console.log(`🌐 App URL: ${serverData.NEXTAUTH_URL || serverData.APP_URL || "http://localhost:3000"}`);
  console.log(`💾 Database: ${serverData.DATABASE_URL?.includes("postgresql") ? "PostgreSQL" : "SQLite"}`);
  console.log(`☁️  Supabase: ${clientData.NEXT_PUBLIC_SUPABASE_URL ? "✅" : "❌"}`);
  console.log(`🔐 Auth: Google OAuth ${serverData.GOOGLE_CLIENT_ID ? "✅" : "❌"}`);
}

// Export individual environment checks for conditional logic (server-side only)
export const isDevelopment = typeof window === "undefined" ? serverEnv.NODE_ENV === "development" : process.env.NODE_ENV === "development";
export const isProduction = typeof window === "undefined" ? serverEnv.NODE_ENV === "production" : process.env.NODE_ENV === "production";
export const isTest = typeof window === "undefined" ? serverEnv.NODE_ENV === "test" : process.env.NODE_ENV === "test";
export const isCI = typeof window === "undefined" ? Boolean(serverEnv.CI) : Boolean(process.env.CI);

// Export database helpers (server-side only)
export const isDatabaseConfigured = () => typeof window === "undefined" ? Boolean(serverEnv.DATABASE_URL) : false;
export const isSupabaseConfigured = () => Boolean(clientEnv.NEXT_PUBLIC_SUPABASE_URL && clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const isGoogleAuthConfigured = () => typeof window === "undefined" ? Boolean(serverEnv.GOOGLE_CLIENT_ID && serverEnv.GOOGLE_CLIENT_SECRET) : false;

// Export helpful environment info (server-side only)
export const databaseType = typeof window === "undefined" ? (serverEnv.DATABASE_URL?.includes("postgresql") ? "postgresql" : "sqlite") : "unknown";
export const appUrl = typeof window === "undefined" ? (serverEnv.NEXTAUTH_URL || serverEnv.APP_URL || (isDevelopment ? "http://localhost:3000" : undefined)) : undefined;