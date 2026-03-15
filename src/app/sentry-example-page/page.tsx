"use client"

import * as Sentry from "@sentry/nextjs"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function SentryExamplePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7F0] dark:bg-black p-6">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Sentry Test Page</h1>
        <p className="text-stone-600 dark:text-stone-400">
          Click the button below to trigger a test error and verify Sentry is working.
        </p>
        <Button
          onClick={() => {
            Sentry.captureException(new Error("Sentry test error from Adventure Log"))
            throw new Error("Sentry Frontend Test Error")
          }}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          Trigger Test Error
        </Button>
        <p className="text-xs text-stone-400">
          After clicking, check your{" "}
          <a href="https://manraj-sidhu.sentry.io/issues/" target="_blank" rel="noopener noreferrer" className="text-olive-600 underline">
            Sentry dashboard
          </a>{" "}
          for the error.
        </p>
        <Link href="/" className="text-sm text-olive-600 hover:text-olive-700 block">
          Back to home
        </Link>
      </div>
    </div>
  )
}
