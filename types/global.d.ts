/**
 * Global type definitions for Adventure Log Application
 * Provides ultra-strict type safety and comprehensive type coverage
 */

// Environment variables with strict typing
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      DATABASE_URL: string;
      NEXTAUTH_URL: string | undefined;
      NEXTAUTH_SECRET: string | undefined;
      GOOGLE_CLIENT_ID: string;
      GOOGLE_CLIENT_SECRET: string;
      NEXT_PUBLIC_SUPABASE_URL: string;
      NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
      SUPABASE_SERVICE_ROLE_KEY: string;
      NEXT_PUBLIC_SUPABASE_BUCKET: string;
      NEXT_PUBLIC_APP_NAME?: string;
      NEXT_PUBLIC_APP_DESCRIPTION?: string;
      NEXT_PUBLIC_THEME_COLOR?: string;
      NEXT_PUBLIC_VERCEL_ANALYTICS_ID?: string;
      NEXT_PUBLIC_VERCEL_SPEED_INSIGHTS?: string;
      NEXT_PUBLIC_GOOGLE_ANALYTICS?: string;
      APPLE_CLIENT_ID?: string;
      APPLE_CLIENT_SECRET?: string;
      SHADOW_DATABASE_URL?: string;
    }
  }

  // Enhanced Window interface with strict typing
  interface Window {
    // Analytics
    readonly gtag?: (
      command: "config" | "event" | "set",
      targetId: string,
      config?: Record<string, unknown>
    ) => void;

    // PWA related
    readonly __PWA_SW__?: ServiceWorker;
    readonly __PWA_MANIFEST__?: Record<string, unknown>;

    // Development tools
    readonly __REACT_DEVTOOLS_GLOBAL_HOOK__?: Record<string, unknown>;
  }

  // Utility types for ultra-strict typing
  type NonEmptyArray<T> = readonly [T, ...(readonly T[])];

  type Prettify<T> = {
    [K in keyof T]: T[K];
  } & object;

  type RequiredKeys<T> = {
    [K in keyof T]-?: object extends Pick<T, K> ? never : K;
  }[keyof T];

  type OptionalKeys<T> = {
    [K in keyof T]-?: object extends Pick<T, K> ? K : never;
  }[keyof T];

  type StrictPick<T, K extends keyof T> = {
    [P in K]: T[P];
  };

  type StrictOmit<T, K extends keyof T> = {
    [P in Exclude<keyof T, K>]: T[P];
  };

  // API Response types with strict error handling
  type ApiSuccessResponse<T = unknown> = {
    readonly success: true;
    readonly data: T;
    readonly error?: never;
    readonly message?: string;
    readonly timestamp: string;
  };

  type ApiErrorResponse = {
    readonly success: false;
    readonly data?: never;
    readonly error: {
      readonly code: string;
      readonly message: string;
      readonly details?: Record<string, unknown>;
    };
    readonly timestamp: string;
  };

  type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

  // Strict database operation results
  type DatabaseOperationResult<T = unknown> =
    | { readonly success: true; readonly data: T; readonly error?: never }
    | { readonly success: false; readonly data?: never; readonly error: Error };

  // Form validation types
  type ValidationResult<T> =
    | { readonly success: true; readonly data: T; readonly error?: never }
    | {
        readonly success: false;
        readonly data?: never;
        readonly error: {
          readonly field?: string;
          readonly message: string;
          readonly code: string;
        };
      };

  // Strict pagination types
  type PaginationParams = {
    readonly page: number;
    readonly limit: number;
  };

  type PaginatedResponse<T> = {
    readonly data: readonly T[];
    readonly pagination: {
      readonly page: number;
      readonly limit: number;
      readonly total: number;
      readonly totalPages: number;
      readonly hasNext: boolean;
      readonly hasPrev: boolean;
    };
  };

  // File upload types with strict validation
  type FileUploadResult =
    | {
        readonly success: true;
        readonly data: {
          readonly url: string;
          readonly key: string;
          readonly size: number;
          readonly type: string;
          readonly metadata?: Record<string, unknown>;
        };
        readonly error?: never;
      }
    | {
        readonly success: false;
        readonly data?: never;
        readonly error: {
          readonly code: "FILE_TOO_LARGE" | "INVALID_TYPE" | "UPLOAD_FAILED";
          readonly message: string;
        };
      };

  // Geolocation types with strict boundaries
  type Coordinates = {
    readonly latitude: number; // -90 to 90
    readonly longitude: number; // -180 to 180
  };

  type LocationData = Coordinates & {
    readonly country: string;
    readonly city?: string;
    readonly address?: string;
  };

  // Strict color theme types
  type ThemeMode = "light" | "dark" | "system";

  type ColorPalette = {
    readonly primary: string;
    readonly secondary: string;
    readonly accent: string;
    readonly background: string;
    readonly foreground: string;
    readonly muted: string;
    readonly destructive: string;
  };

  // User preference types
  type UserPreferences = {
    readonly theme: ThemeMode;
    readonly language: string;
    readonly timezone: string;
    readonly notifications: {
      readonly email: boolean;
      readonly push: boolean;
      readonly marketing: boolean;
    };
    readonly privacy: {
      readonly profileVisibility: "PUBLIC" | "FRIENDS_ONLY" | "PRIVATE";
      readonly showLocation: boolean;
      readonly showTravelStats: boolean;
    };
  };

  // Error handling types
  type AppError = Error & {
    readonly code: string;
    readonly statusCode?: number;
    readonly metadata?: Record<string, unknown>;
  };

  type ErrorBoundaryState = {
    readonly hasError: boolean;
    readonly error?: AppError;
    readonly errorInfo?: {
      readonly componentStack: string;
      readonly errorBoundary?: string;
    };
  };

  // PWA types
  type PWAInstallPrompt = {
    readonly prompt: () => Promise<void>;
    readonly userChoice: Promise<{
      readonly outcome: "accepted" | "dismissed";
      readonly platform: string;
    }>;
  };

  // Development and debugging types
  type DebugInfo = {
    readonly buildId: string;
    readonly version: string;
    readonly environment: NodeJS.ProcessEnv["NODE_ENV"];
    readonly timestamp: string;
    readonly userAgent: string;
  };

  // Generic utility types for forms and validation
  type FormFieldError = {
    readonly message: string;
    readonly code: string;
  };

  type FormState<T> = {
    readonly data: Partial<T>;
    readonly errors: Partial<Record<keyof T, FormFieldError>>;
    readonly isSubmitting: boolean;
    readonly isValid: boolean;
  };

  // Strict component prop types
  type ComponentPropsWithChildren<P = object> = P & {
    readonly children: React.ReactNode;
  };

  type ComponentPropsWithOptionalChildren<P = object> = P & {
    readonly children?: React.ReactNode;
  };

  type StrictComponentProps<T> = {
    readonly [K in keyof T]: T[K];
  };
}

// Export empty object to make this a module
export {};
