import { z } from "zod";

// Server-side environment variables schema
const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SHADOW_DATABASE_URL: z.string().optional(),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET must be at least 32 characters"),
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  NEXT_PUBLIC_SUPABASE_BUCKET: z.string().default("adventure-photos"),
  // Optional integrations
  SLACK_WEBHOOK_URL: z.string().url().optional(),
  SENTRY_DSN: z.string().url().optional(),
  // Redis for rate limiting (optional - will use in-memory fallback)
  REDIS_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

// Client-side environment variables schema
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_BUCKET: z.string().default("adventure-photos"),
  NEXT_PUBLIC_PWA_ENABLED: z.string().optional(),
  NEXT_PUBLIC_IS_MOBILE: z.string().optional(),
});

// Type-safe environment variable access
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

// Validate server environment variables
function validateServerEnv(): ServerEnv {
  try {
    const env = serverEnvSchema.parse(process.env);
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("\n");

      console.error("❌ Invalid server environment variables:");
      console.error(errorMessages);
      process.exit(1);
    }
    throw error;
  }
}

// Validate client environment variables
function validateClientEnv(): ClientEnv {
  const clientEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_BUCKET: process.env.NEXT_PUBLIC_SUPABASE_BUCKET,
    NEXT_PUBLIC_PWA_ENABLED: process.env.NEXT_PUBLIC_PWA_ENABLED,
    NEXT_PUBLIC_IS_MOBILE: process.env.NEXT_PUBLIC_IS_MOBILE,
  };

  try {
    return clientEnvSchema.parse(clientEnv);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("\n");

      console.error("❌ Invalid client environment variables:");
      console.error(errorMessages);

      if (typeof window === "undefined") {
        // Server-side error
        process.exit(1);
      } else {
        // Client-side error - throw instead of exit
        throw new Error(
          `Client environment validation failed:\n${errorMessages}`
        );
      }
    }
    throw error;
  }
}

// Environment helper functions
export const isProduction = () => process.env.NODE_ENV === "production";
export const isDevelopment = () => process.env.NODE_ENV === "development";
export const isTest = () => process.env.NODE_ENV === "test";

export const isDatabaseConfigured = () => {
  return !!(process.env.DATABASE_URL && process.env.DATABASE_URL.length > 0);
};

export const isRedisConfigured = () => {
  return !!(
    process.env.REDIS_URL ||
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  );
};

export const isSupabaseConfigured = () => {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

export const isGoogleOAuthConfigured = () => {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
};

// Cached environment variables
let _serverEnv: ServerEnv | null = null;
let _clientEnv: ClientEnv | null = null;

// Server environment - only accessible server-side
export function getServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error(
      "❌ Server environment variables cannot be accessed on the client side!"
    );
  }

  if (!_serverEnv) {
    _serverEnv = validateServerEnv();
  }

  return _serverEnv;
}

// Client environment - accessible on both sides
export const clientEnv: ClientEnv = (() => {
  if (!_clientEnv) {
    _clientEnv = validateClientEnv();
  }

  return _clientEnv;
})();

// Environment status checker for health checks
export function getEnvironmentStatus() {
  return {
    nodeEnv: process.env.NODE_ENV,
    isDevelopment: isDevelopment(),
    isProduction: isProduction(),
    isTest: isTest(),
    database: isDatabaseConfigured(),
    supabase: isSupabaseConfigured(),
    googleOAuth: isGoogleOAuthConfigured(),
    redis: isRedisConfigured(),
    timestamp: new Date().toISOString(),
  };
}

// Export for backward compatibility (if needed)
export { getServerEnv as default };
