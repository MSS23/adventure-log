export type FilterTab = 'all' | 'high' | 'completed'
export type Priority = 'low' | 'medium' | 'high'

export const priorityConfig: Record<Priority, { label: string; color: string; dot: string }> = {
  low: {
    label: 'Low',
    color: 'bg-muted text-muted-foreground border border-border',
    dot: 'bg-muted-foreground/60',
  },
  medium: {
    // Slightly deeper tint + border so the gold text reads ≥4.5:1 in both
    // themes (light gold on ivory was the weak case at /15).
    label: 'Medium',
    color: 'bg-[color:var(--color-gold)]/20 text-[color:var(--color-gold)] border border-[color:var(--color-gold)]/35',
    dot: 'bg-[color:var(--color-gold)]',
  },
  high: {
    label: 'High',
    color: 'bg-accent/10 text-accent border border-accent/20',
    dot: 'bg-accent',
  },
}

/** Resolve a priority config, defaulting to "medium" for unknown/missing values. */
export function priorityOf(priority: string | null | undefined) {
  return priorityConfig[(priority as Priority) || 'medium'] ?? priorityConfig.medium
}
