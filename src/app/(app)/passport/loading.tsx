export default function PassportLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Passport card */}
      <div className="bg-white dark:bg-[#111111] rounded-2xl p-6 shadow-sm space-y-6 mb-8">
        {/* Coverage ring placeholder */}
        <div className="w-32 h-32 mx-auto rounded-full border-8 border-olive-100 dark:border-white/[0.05] animate-pulse" />

        {/* Name */}
        <div className="h-6 w-40 mx-auto bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
        <div className="h-4 w-28 mx-auto bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />

        {/* Continent progress */}
        <div className="grid grid-cols-3 gap-3 pt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-2 w-full bg-olive-100 dark:bg-white/[0.05] rounded-full animate-pulse" />
              <div className="h-3 w-12 mx-auto bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Country strip */}
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="w-10 h-7 rounded bg-olive-100 dark:bg-white/[0.05] animate-pulse shrink-0" />
        ))}
      </div>
    </div>
  );
}
