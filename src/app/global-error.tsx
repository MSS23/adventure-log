'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body className="min-h-screen bg-stone-50 dark:bg-white/[0.04] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-2">Something went wrong</h1>
          <p className="text-stone-600 dark:text-stone-400 mb-6">An unexpected error occurred. Please try again.</p>
          {error.digest && (
            <p className="text-xs text-stone-400 dark:text-stone-500 mb-4 font-mono">Error ID: {error.digest}</p>
          )}
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-[color:var(--color-forest)] text-white rounded-lg hover:bg-[color:var(--color-forest-deep)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-forest)] focus-visible:ring-offset-2"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  )
}
