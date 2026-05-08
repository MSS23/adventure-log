export default function GlobeLoading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#FAF7F1] dark:bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-4 border-olive-200 dark:border-olive-900 animate-pulse" />
          <svg
            className="absolute inset-0 w-24 h-24 animate-spin text-olive-500"
            style={{ animationDuration: '3s' }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M12 2L12 5M12 19L12 22M2 12L5 12M19 12L22 12" strokeLinecap="round" />
            <path d="M4.93 4.93L7.05 7.05M16.95 16.95L19.07 19.07M4.93 19.07L7.05 16.95M16.95 7.05L19.07 4.93" strokeLinecap="round" />
            <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
          </svg>
        </div>
        <div className="h-3 w-32 bg-olive-100 dark:bg-white/[0.05] rounded animate-pulse" />
      </div>
    </div>
  );
}
