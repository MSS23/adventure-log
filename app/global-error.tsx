"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global application error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            fontFamily: "system-ui, sans-serif",
            background: "linear-gradient(135deg, #fef2f2, #fecaca)",
            color: "#374151",
          }}
        >
          <div
            style={{
              maxWidth: "400px",
              textAlign: "center",
              backgroundColor: "white",
              padding: "40px",
              borderRadius: "12px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
            }}
          >
            <div
              style={{
                width: "80px",
                height: "80px",
                backgroundColor: "#ef4444",
                borderRadius: "50%",
                margin: "0 auto 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
                color: "white",
              }}
            >
              ⚠️
            </div>

            <h1
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                marginBottom: "16px",
                color: "#111827",
              }}
            >
              Critical Error
            </h1>

            <p
              style={{
                marginBottom: "24px",
                color: "#6b7280",
                lineHeight: "1.6",
              }}
            >
              Adventure Log has encountered a critical error. We apologize for
              the inconvenience.
            </p>

            <button
              onClick={() => reset()}
              style={{
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                padding: "12px 24px",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px",
                marginRight: "12px",
              }}
            >
              Try Again
            </button>

            <a
              href="/"
              style={{
                display: "inline-block",
                padding: "12px 24px",
                borderRadius: "8px",
                textDecoration: "none",
                color: "#6b7280",
                border: "1px solid #d1d5db",
              }}
            >
              Go Home
            </a>

            <div
              style={{
                marginTop: "24px",
                paddingTop: "24px",
                borderTop: "1px solid #e5e7eb",
                fontSize: "14px",
                color: "#9ca3af",
              }}
            >
              Error ID: {error.digest || "Unknown"}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
