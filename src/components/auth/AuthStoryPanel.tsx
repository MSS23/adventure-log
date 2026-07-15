import Link from 'next/link'
import { GitCompareArrows, Globe2, MapPinned, ShieldCheck } from 'lucide-react'
import { RoamkeepMark } from '@/components/brand/RoamkeepMark'

const highlights = [
  {
    icon: MapPinned,
    title: 'Keep trips without the work',
    description: 'Turn camera-roll moments into a living map of where you have been.',
  },
  {
    icon: GitCompareArrows,
    title: 'Discover through people',
    description: 'Save meaningful places from friends and travelers who share your taste.',
  },
  {
    icon: ShieldCheck,
    title: 'Share without oversharing',
    description: 'Public timelines use years and seasons—not exact travel dates.',
  },
]

/** Product context for auth screens, kept CSS-only so sign-in stays lightweight. */
export function AuthStoryPanel() {
  return (
    <aside
      aria-label="What you can do with Roamkeep"
      className="relative hidden min-h-[650px] overflow-hidden rounded-[28px] border border-olive-700/40 bg-olive-950 p-10 text-white shadow-[0_24px_70px_-38px_rgba(20,31,18,0.8)] lg:flex lg:flex-col"
    >
      <div
        aria-hidden
        className="absolute -right-24 -top-24 h-80 w-80 rounded-full border border-olive-300/10 bg-olive-400/5"
      />
      <div
        aria-hidden
        className="absolute -right-10 top-12 h-52 w-52 rounded-full border border-dashed border-olive-300/20"
      />
      <Globe2
        aria-hidden
        className="absolute right-8 top-20 h-36 w-36 text-olive-200/10"
        strokeWidth={1}
      />

      <Link
        href="/"
        className="relative z-10 inline-flex w-fit min-h-11 items-center gap-2.5 rounded-xl text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-300"
      >
        <RoamkeepMark inverted />
      </Link>

      <div className="relative z-10 mt-auto max-w-lg pt-24">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-olive-300">
          Keep the places that made you
        </p>
        <h2 className="mt-4 max-w-md font-heading text-4xl font-bold leading-[1.05] tracking-tight text-white">
          Your memories have a place in the world.
        </h2>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-olive-100/70">
          Capture trips, return to the moments that mattered, and find your next place through
          people you trust.
        </p>

        <ul className="mt-8 space-y-3" aria-label="Roamkeep highlights">
          {highlights.map(({ icon: Icon, title, description }) => (
            <li
              key={title}
              className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.045] p-3.5 backdrop-blur-sm"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-olive-400/12 text-olive-300">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-semibold text-white">{title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-olive-100/60">
                  {description}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative z-10 mt-8 flex items-center gap-2 text-xs text-olive-200/60">
        <ShieldCheck className="h-4 w-4" aria-hidden />
        You control who can see each memory and exactly how much location is shared.
      </div>
    </aside>
  )
}
