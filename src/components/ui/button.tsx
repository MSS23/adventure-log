import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-base font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:ring-offset-2 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-teal-600 text-white hover:bg-teal-700 shadow-sm hover:shadow-md",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow-md focus-visible:ring-red-500/20",
        outline:
          "border border-gray-300 bg-white shadow-sm hover:bg-gray-50 hover:border-gray-400 text-gray-700",
        secondary:
          "bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-200",
        ghost:
          "hover:bg-gray-100 hover:text-gray-900 text-gray-700",
        link: "text-teal-600 underline-offset-4 hover:underline hover:text-teal-700",
      },
      size: {
        default: "h-11 px-4 py-2 has-[>svg]:px-3",
        sm: "h-10 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-12 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-11",
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
