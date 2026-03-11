import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-base font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:ring-offset-2 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "bg-olive-700 text-white hover:bg-olive-800 shadow-sm hover:shadow-md",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow-md focus-visible:ring-red-500/20",
        outline:
          "border border-olive-200 dark:border-white/[0.1] bg-white dark:bg-[#111111] shadow-sm hover:bg-olive-50 dark:hover:bg-[#1A1A1A] hover:border-olive-300 text-olive-800 dark:text-olive-200",
        secondary:
          "bg-olive-100 dark:bg-[#1A1A1A] text-olive-900 dark:text-olive-100 hover:bg-olive-200 dark:hover:bg-[#252525] border border-olive-200/50 dark:border-white/[0.08]",
        ghost:
          "hover:bg-olive-100 dark:hover:bg-white/[0.06] hover:text-olive-900 dark:hover:text-olive-100 text-olive-700 dark:text-olive-300",
        link: "text-olive-700 underline-offset-4 hover:underline hover:text-olive-800 dark:text-olive-400 dark:hover:text-olive-300",
      },
      size: {
        default: "h-11 px-5 py-2 has-[>svg]:px-3",
        sm: "h-10 rounded-lg gap-1.5 px-3.5 has-[>svg]:px-2.5 text-sm",
        lg: "h-12 rounded-xl px-6 has-[>svg]:px-4",
        icon: "size-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
