export default function WishlistLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="h-8 w-28 rounded animate-pulse mb-6" style={{ background: 'var(--color-ivory-alt)' }} />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 rounded-xl"
            style={{ background: 'var(--card)', border: '1px solid var(--color-line-warm)' }}
          >
            <div className="w-16 h-16 rounded-lg animate-pulse shrink-0" style={{ background: 'var(--color-ivory-alt)' }} />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/2 rounded animate-pulse" style={{ background: 'var(--color-ivory-alt)' }} />
              <div className="h-3 w-1/3 rounded animate-pulse" style={{ background: 'var(--color-ivory-alt)' }} />
            </div>
            <div className="w-8 h-8 rounded-full animate-pulse shrink-0" style={{ background: 'var(--color-ivory-alt)' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
