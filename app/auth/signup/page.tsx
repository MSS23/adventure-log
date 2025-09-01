"use client";

import { Globe } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50">
      <div className="max-w-md w-full space-y-8 p-6">
        <div className="text-center">
          <Globe className="mx-auto h-12 w-12 text-primary" />
          <h2 className="mt-6 text-3xl font-bold">Sign Up</h2>
          <p className="mt-2 text-muted-foreground">
            Feature coming soon. Please use sign in for now.
          </p>
          <Link
            href="/auth/signin"
            className="mt-4 inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
