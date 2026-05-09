'use client'

import * as React from "react"
import { motion, type HTMLMotionProps } from "framer-motion"

import { cn } from "@/lib/utils"

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        // Editorial card: warm border, layered soft shadow, 20px radius — matches .al-card
        "bg-[color:var(--card)] text-[color:var(--card-foreground)]",
        "flex flex-col gap-6 rounded-[20px] border border-[color:var(--color-line-warm)] py-6",
        "shadow-[0_1px_2px_rgba(26,20,14,0.04),0_4px_16px_rgba(26,20,14,0.06)]",
        className
      )}
      {...props}
    />
  )
}

interface MotionCardProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  /** Disable the lift-on-hover affordance (default: enabled). */
  flat?: boolean
}

/**
 * Card variant with a tasteful framer-motion hover lift. Use for grid tiles,
 * actionable surfaces, or anywhere the resting card feels too inert.
 */
const MotionCard = React.forwardRef<HTMLDivElement, MotionCardProps>(
  function MotionCard({ className, flat = false, children, ...props }, ref) {
    return (
      <motion.div
        ref={ref}
        data-slot="card"
        whileHover={
          flat
            ? undefined
            : {
                y: -3,
                boxShadow:
                  "0 2px 4px rgba(26,20,14,0.06), 0 16px 36px rgba(26,20,14,0.10)",
              }
        }
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        className={cn(
          "bg-[color:var(--card)] text-[color:var(--card-foreground)]",
          "flex flex-col gap-6 rounded-[20px] border border-[color:var(--color-line-warm)] py-6",
          "shadow-[0_1px_2px_rgba(26,20,14,0.04),0_4px_16px_rgba(26,20,14,0.06)]",
          "will-change-transform",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading leading-tight font-semibold tracking-tight text-[color:var(--color-ink)]",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-[color:var(--color-muted-warm)] text-sm leading-relaxed", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  MotionCard,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
