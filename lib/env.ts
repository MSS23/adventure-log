import { z } from "zod";

// Server-side environment variables schema
const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SHADOW_DATABASE_URL: z.string().optional(),
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

// Check if we're in build mode (skip strict validation during build)
const isBuildTime =
  process.env.NODE_ENV === undefined ||
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.VERCEL_ENV === undefined;

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

      // During build time, log warnings but don't exit
      if (isBuildTime) {
        console.warn(
          "⚠️ Build-time environment validation failed - this is expected during deployment"
        );
        console.warn("Environment variables will be validated at runtime");

        // Return a partial env object with fallbacks for build
        return {
          NODE_ENV: (process.env.NODE_ENV as any) || "production",
          DATABASE_URL: process.env.DATABASE_URL || "",
          GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
          GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
          NEXT_PUBLIC_SUPABASE_ANON_KEY:
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
          SUPABASE_SERVICE_ROLE_KEY:
            process.env.SUPABASE_SERVICE_ROLE_KEY || "",
          NEXT_PUBLIC_SUPABASE_BUCKET:
            process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "adventure-photos",
          SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
          SENTRY_DSN: process.env.SENTRY_DSN,
          REDIS_URL: process.env.REDIS_URL,
          UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
          UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
        } as ServerEnv;
      } else {
        // In production runtime, exit on validation failure
        process.exit(1);
      }
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
        if (isBuildTime) {
          console.warn(
            "⚠️ Client environment validation failed during build - using fallbacks"
          );
          return {
            NEXT_PUBLIC_SUPABASE_URL:
              process.env.NEXT_PUBLIC_SUPABASE_URL || "",
            NEXT_PUBLIC_SUPABASE_ANON_KEY:
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
            NEXT_PUBLIC_SUPABASE_BUCKET:
              process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "adventure-photos",
            NEXT_PUBLIC_PWA_ENABLED: process.env.NEXT_PUBLIC_PWA_ENABLED,
            NEXT_PUBLIC_IS_MOBILE: process.env.NEXT_PUBLIC_IS_MOBILE,
          } as ClientEnv;
        } else {
          process.exit(1);
        }
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

// Environment helper functions - build-safe
export const isProduction = () => {
  const nodeEnv = process.env.NODE_ENV;
  return nodeEnv === "production";
};

export const isDevelopment = () => {
  const nodeEnv = process.env.NODE_ENV;
  return nodeEnv === "development";
};

export const isTest = () => {
  const nodeEnv = process.env.NODE_ENV;
  return nodeEnv === "test";
};

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

// Build-safe version that doesn't throw during Next.js build
export function getServerEnvSafe(): Partial<ServerEnv> {
  if (typeof window !== "undefined") {
    return {};
  }

  try {
    return getServerEnv();
  } catch (error) {
    // During build, return what we can safely access
    if (isBuildTime) {
      return {
        NODE_ENV: (process.env.NODE_ENV as any) || "production",
        DATABASE_URL: process.env.DATABASE_URL || "",
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
      };
    }
    throw error;
  }
}

// Client environment - accessible on both sides
// Lazy initialization to avoid SSR issues
let _clientEnvInitialized = false;
export const getClientEnv = (): ClientEnv => {
  if (!_clientEnvInitialized) {
    _clientEnv = validateClientEnv();
    _clientEnvInitialized = true;
  }
  return _clientEnv!;
};

// Backward compatibility - but prefer using getClientEnv()
export const clientEnv: ClientEnv = new Proxy({} as ClientEnv, {
  get(_target, prop) {
    return getClientEnv()[prop as keyof ClientEnv];
  },
});

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
