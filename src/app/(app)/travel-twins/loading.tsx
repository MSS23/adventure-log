export default function TravelTwinsLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="h-8 w-44 rounded animate-pulse mb-2" style={{ background: 'var(--color-ivory-alt)' }} />
      <div className="h-4 w-64 max-w-full rounded animate-pulse mb-6" style={{ background: 'var(--color-ivory-alt)' }} />

      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 rounded-xl"
            style={{ background: 'var(--card)', border: '1px solid var(--color-line-warm)' }}
          >
            <div className="w-12 h-12 rounded-full animate-pulse shrink-0" style={{ background: 'var(--color-ivory-alt)' }} />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-36 rounded animate-pulse" style={{ background: 'var(--color-ivory-alt)' }} />
              <div className="h-3 w-48 max-w-full rounded animate-pulse" style={{ background: 'var(--color-ivory-alt)' }} />
            </div>
            <div className="h-9 w-20 rounded-lg animate-pulse shrink-0" style={{ background: 'var(--color-ivory-alt)' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
