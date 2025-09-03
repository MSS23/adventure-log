import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { randomUUID } from "crypto";
import { logger } from "./logger";

// Standard API response interface
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string | string[];
  message?: string;
  requestId: string;
  timestamp: string;
}

// Error response with correlation ID and structured format
interface ErrorDetails {
  code?: string;
  field?: string;
  message: string;
}

/**
 * Generate or extract request ID from headers
 */
export function getRequestId(request?: Request): string {
  const requestId = request?.headers.get("x-request-id") || randomUUID();
  return requestId;
}

/**
 * Success response helper
 */
export function ok<T>(
  data: T,
  init?: ResponseInit & { message?: string; requestId?: string }
): Response {
  const { message, requestId, ...responseInit } = init || {};
  const id = requestId || randomUUID();

  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    requestId: id,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, {
    status: 200,
    headers: {
      "x-request-id": id,
      ...responseInit.headers,
    },
    ...responseInit,
  });
}

/**
 * Bad request (400) response helper
 */
export function badRequest(
  errors: string | string[] | ZodError | ErrorDetails[],
  init?: ResponseInit & { requestId?: string }
): Response {
  const { requestId, ...responseInit } = init || {};
  const id = requestId || randomUUID();

  let errorMessages: string | string[];

  if (errors instanceof ZodError) {
    errorMessages = errors.issues
      .map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      }))
      .map((err) => `${err.field}: ${err.message}`);
  } else if (
    Array.isArray(errors) &&
    errors.length > 0 &&
    typeof errors[0] === "object"
  ) {
    errorMessages = (errors as ErrorDetails[]).map((err) =>
      err.field ? `${err.field}: ${err.message}` : err.message
    );
  } else {
    errorMessages = errors as string | string[];
  }

  const response: ApiResponse = {
    success: false,
    error: errorMessages,
    requestId: id,
    timestamp: new Date().toISOString(),
  };

  // Log validation errors for debugging
  logger.debug("Bad request:", { requestId: id, error: errorMessages });

  return NextResponse.json(response, {
    status: 400,
    headers: {
      "x-request-id": id,
      ...responseInit.headers,
    },
    ...responseInit,
  });
}

/**
 * Unauthorized (401) response helper
 */
export function unauthorized(
  message: string = "Authentication required",
  init?: ResponseInit & { requestId?: string }
): Response {
  const { requestId, ...responseInit } = init || {};
  const id = requestId || randomUUID();

  const response: ApiResponse = {
    success: false,
    error: message,
    requestId: id,
    timestamp: new Date().toISOString(),
  };

  logger.warn("Unauthorized access attempt:", { requestId: id, message });

  return NextResponse.json(response, {
    status: 401,
    headers: {
      "x-request-id": id,
      "WWW-Authenticate": "Bearer",
      ...responseInit.headers,
    },
    ...responseInit,
  });
}

/**
 * Forbidden (403) response helper
 */
export function forbidden(
  message: string = "Access forbidden",
  init?: ResponseInit & { requestId?: string }
): Response {
  const { requestId, ...responseInit } = init || {};
  const id = requestId || randomUUID();

  const response: ApiResponse = {
    success: false,
    error: message,
    requestId: id,
    timestamp: new Date().toISOString(),
  };

  logger.warn("Forbidden access attempt:", { requestId: id, message });

  return NextResponse.json(response, {
    status: 403,
    headers: {
      "x-request-id": id,
      ...responseInit.headers,
    },
    ...responseInit,
  });
}

/**
 * Not found (404) response helper
 */
export function notFound(
  message: string = "Resource not found",
  init?: ResponseInit & { requestId?: string }
): Response {
  const { requestId, ...responseInit } = init || {};
  const id = requestId || randomUUID();

  const response: ApiResponse = {
    success: false,
    error: message,
    requestId: id,
    timestamp: new Date().toISOString(),
  };

  logger.debug("Resource not found:", { requestId: id, message });

  return NextResponse.json(response, {
    status: 404,
    headers: {
      "x-request-id": id,
      ...responseInit.headers,
    },
    ...responseInit,
  });
}

/**
 * Rate limit exceeded (429) response helper
 */
export function rateLimitExceeded(
  retryAfter: number,
  message: string = "Rate limit exceeded",
  init?: ResponseInit & { requestId?: string }
): Response {
  const { requestId, ...responseInit } = init || {};
  const id = requestId || randomUUID();

  const response: ApiResponse = {
    success: false,
    error: message,
    requestId: id,
    timestamp: new Date().toISOString(),
  };

  logger.warn("Rate limit exceeded:", { requestId: id, retryAfter });

  return NextResponse.json(response, {
    status: 429,
    headers: {
      "x-request-id": id,
      "Retry-After": retryAfter.toString(),
      ...responseInit.headers,
    },
    ...responseInit,
  });
}

/**
 * Server error (500) response helper
 */
export function serverError(
  error: Error | unknown,
  message: string = "Internal server error",
  init?: ResponseInit & { requestId?: string }
): Response {
  const { requestId, ...responseInit } = init || {};
  const id = requestId || randomUUID();

  // Log the actual error for debugging
  if (error instanceof Error) {
    logger.error("Server error:", {
      requestId: id,
      error: error.message,
      stack: error.stack,
      name: error.name,
    });
  } else {
    logger.error("Unknown server error:", { requestId: id, error });
  }

  const response: ApiResponse = {
    success: false,
    error: message,
    requestId: id,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, {
    status: 500,
    headers: {
      "x-request-id": id,
      ...responseInit.headers,
    },
    ...responseInit,
  });
}

/**
 * Created (201) response helper
 */
export function created<T>(
  data: T,
  init?: ResponseInit & { message?: string; requestId?: string }
): Response {
  const { message, requestId, ...responseInit } = init || {};
  const id = requestId || randomUUID();

  const response: ApiResponse<T> = {
    success: true,
    data,
    message: message || "Resource created successfully",
    requestId: id,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, {
    status: 201,
    headers: {
      "x-request-id": id,
      ...responseInit.headers,
    },
    ...responseInit,
  });
}

/**
 * No content (204) response helper
 */
export function noContent(
  init?: ResponseInit & { requestId?: string }
): Response {
  const { requestId, ...responseInit } = init || {};
  const id = requestId || randomUUID();

  return new Response(null, {
    status: 204,
    headers: {
      "x-request-id": id,
      ...responseInit.headers,
    },
    ...responseInit,
  });
}

/**
 * Generic error handler for API routes
 * Catches and standardizes all types of errors
 */
export function handleApiError(error: unknown, requestId?: string): Response {
  const id = requestId || randomUUID();

  // Handle different error types
  if (error instanceof ZodError) {
    return badRequest(error, { requestId: id });
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (
      message.includes("unauthorized") ||
      message.includes("authentication")
    ) {
      return unauthorized(error.message, { requestId: id });
    }

    if (message.includes("forbidden") || message.includes("permission")) {
      return forbidden(error.message, { requestId: id });
    }

    if (message.includes("not found")) {
      return notFound(error.message, { requestId: id });
    }

    if (message.includes("rate limit")) {
      const retryAfter = extractRetryAfter(error.message);
      return rateLimitExceeded(retryAfter, error.message, { requestId: id });
    }

    // Default to server error for unknown Error instances
    return serverError(error, error.message, { requestId: id });
  }

  // Handle string errors
  if (typeof error === "string") {
    return serverError(new Error(error), error, { requestId: id });
  }

  // Handle unknown error types
  return serverError(error, "An unexpected error occurred", { requestId: id });
}

/**
 * Extract retry-after seconds from rate limit error message
 */
function extractRetryAfter(message: string): number {
  const match = message.match(/(\d+)\s*seconds?/i);
  return match ? parseInt(match[1], 10) : 60; // Default to 60 seconds
}

/**
 * API route wrapper that adds consistent error handling and request ID
 */
export function withApiHandler(
  handler: (request: Request, requestId: string) => Promise<Response>
) {
  return async function (request: Request): Promise<Response> {
    const requestId = getRequestId(request);

    try {
      // Add request ID to request headers for downstream use
      const modifiedRequest = new Request(request, {
        headers: {
          ...request.headers,
          "x-request-id": requestId,
        },
      });

      return await handler(modifiedRequest, requestId);
    } catch (error) {
      return handleApiError(error, requestId);
    }
  };
}

/**
 * Validation helper that combines request parsing and validation
 */
export async function validateRequest<T>(
  request: Request,
  schema: any
): Promise<T> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw error; // Will be handled by handleApiError
    }
    throw new Error(`Invalid request body: ${error}`);
  }
}

/**
 * Query parameter validation helper
 */
export function validateSearchParams<T>(
  searchParams: URLSearchParams,
  schema: any
): T {
  const params = Object.fromEntries(searchParams);

  // Convert string numbers to numbers for validation
  const processedParams: any = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && /^\d+$/.test(value)) {
      processedParams[key] = parseInt(value, 10);
    } else if (typeof value === "string" && value === "true") {
      processedParams[key] = true;
    } else if (typeof value === "string" && value === "false") {
      processedParams[key] = false;
    } else {
      processedParams[key] = value;
    }
  }

  return schema.parse(processedParams);
}
