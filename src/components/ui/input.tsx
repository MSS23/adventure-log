"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base layout
        "h-10 w-full min-w-0 rounded-xl border px-3 py-1 text-base transition-[color,box-shadow] outline-none md:text-sm",
        // Semantic tokens — warm in both themes
        "border-border bg-card text-foreground placeholder:text-muted-foreground/80 selection:bg-primary selection:text-primary-foreground",
        // Dark mode — slightly raised warm surface so inputs read as fields,
        // not cutouts, against the umber card background.
        "dark:bg-secondary",
        // File input quirk
        "file:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        // States
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
        // Autofill — Chromium overrides bg/text aggressively; mirror per-mode
        "autofill:bg-white autofill:text-black autofill:shadow-[inset_0_0_0_1000px_white]",
        "dark:autofill:shadow-[inset_0_0_0_1000px_#221D13] dark:autofill:text-[#F2EBD7]",
        className
      )}
      suppressHydrationWarning
      {...props}
    />
  )
}

export { Input }
