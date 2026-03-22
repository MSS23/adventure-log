export default function SettingsLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="h-8 w-24 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse mb-6" />

      {[1, 2, 3].map((section) => (
        <div key={section} className="mb-8">
          <div className="h-5 w-28 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse mb-4" />
          <div className="bg-white dark:bg-[#111111] rounded-xl divide-y divide-olive-100 dark:divide-white/[0.05]">
            {[1, 2, 3].map((row) => (
              <div key={row} className="flex items-center justify-between p-4">
                <div className="h-4 w-32 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
                <div className="h-6 w-11 bg-olive-100 dark:bg-white/[0.05] rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
