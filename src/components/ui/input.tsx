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
        "h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm",
        // Light mode colors
        "border-input bg-white text-stone-900 placeholder:text-stone-400 selection:bg-primary selection:text-primary-foreground",
        // Dark mode colors — warm dark surface so inputs don't feel like
        // light cutouts pasted on a dark page.
        "dark:bg-[#221D14] dark:text-stone-100 dark:placeholder:text-stone-500 dark:border-stone-700",
        // File input quirk
        "file:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        // States
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
        // Autofill — Chromium overrides bg/text aggressively; mirror per-mode
        "autofill:bg-white autofill:text-black autofill:shadow-[inset_0_0_0_1000px_white]",
        "dark:autofill:shadow-[inset_0_0_0_1000px_#221D14] dark:autofill:text-stone-100",
        className
      )}
      suppressHydrationWarning
      {...props}
    />
  )
}

export { Input }
