import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-base font-medium",
    "transition-all duration-200 ease-out",
    "disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0",
    "outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-coral)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-ivory)]",
    "aria-invalid:ring-2 aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
    "active:scale-[0.97]",
  ].join(" "),
  {
    variants: {
      variant: {
        // Primary — ink (warm dark) for solid CTAs that aren't the hero action
        default:
          "bg-[color:var(--color-ink)] text-[color:var(--color-ivory)] hover:opacity-90 shadow-[0_1px_2px_rgba(26,20,14,0.06),0_4px_12px_rgba(26,20,14,0.08)] hover:shadow-[0_2px_4px_rgba(26,20,14,0.08),0_8px_20px_rgba(26,20,14,0.12)]",
        // Coral — the editorial hero CTA, matches .al-btn-coral
        coral:
          "bg-[color:var(--color-coral)] text-white rounded-full hover:-translate-y-px shadow-[0_6px_18px_rgba(226,85,58,0.33)] hover:shadow-[0_10px_26px_rgba(226,85,58,0.42)]",
        destructive:
          "bg-[color:var(--destructive)] text-white hover:opacity-90 shadow-sm hover:shadow-md focus-visible:ring-red-500/40",
        outline:
          "border border-[color:var(--color-line-warm)] bg-[color:var(--card)] text-[color:var(--color-ink)] shadow-[0_1px_2px_rgba(26,20,14,0.04)] hover:bg-[color:var(--color-ivory-alt)] hover:border-[color:var(--color-coral)]/30",
        secondary:
          "bg-[color:var(--color-ivory-alt)] text-[color:var(--color-ink)] border border-[color:var(--color-line-warm)] hover:bg-[color:var(--color-line-warm)]",
        ghost:
          "text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)] hover:bg-[color:var(--color-ivory-alt)]",
        link:
          "text-[color:var(--color-coral)] underline-offset-4 hover:underline hover:opacity-80",
      },
      size: {
        default: "h-11 px-5 py-2 has-[>svg]:px-4",
        sm: "h-10 rounded-lg gap-1.5 px-3.5 has-[>svg]:px-2.5 text-sm",
        lg: "h-12 rounded-xl px-6 has-[>svg]:px-5 text-[15px]",
        icon: "size-11 rounded-xl",
        pill: "h-10 rounded-full px-5 text-sm",
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
