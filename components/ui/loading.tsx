import { Loader2, Globe, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({
  className,
  size = "md",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <Loader2 className={cn("animate-spin", sizeClasses[size], className)} />
  );
}

interface LoadingCardProps {
  className?: string;
  message?: string;
  variant?: "default" | "travel" | "globe";
}

export function LoadingCard({
  className,
  message = "Loading...",
  variant = "default",
}: LoadingCardProps) {
  const icons = {
    default: <LoadingSpinner size="lg" />,
    travel: <MapPin className="w-8 h-8 text-blue-500 animate-pulse" />,
    globe: <Globe className="w-8 h-8 text-blue-500 animate-spin" />,
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 rounded-lg bg-background border",
        className
      )}
    >
      <div className="mb-4">{icons[variant]}</div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

interface PageLoadingProps {
  message?: string;
  variant?: "default" | "travel" | "globe";
}

export function PageLoading({
  message = "Loading your adventure...",
  variant = "travel",
}: PageLoadingProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <div className="mb-6">
          {variant === "globe" && (
            <div className="relative mx-auto w-16 h-16 mb-4">
              <div className="absolute inset-0 bg-blue-500 rounded-full opacity-20 animate-ping" />
              <div className="relative w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                <Globe className="w-8 h-8 text-white animate-spin" />
              </div>
            </div>
          )}
          {variant === "travel" && (
            <div className="relative mx-auto w-16 h-16 mb-4">
              <MapPin className="w-16 h-16 text-blue-500 animate-bounce mx-auto" />
            </div>
          )}
          {variant === "default" && (
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
          )}
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">
          {message}
        </h2>
        <p className="text-sm text-muted-foreground">
          Please wait while we prepare your journey
        </p>
      </div>
    </div>
  );
}

export function TableLoading({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <div className="skeleton w-12 h-12 rounded-full" />
          <div className="space-y-2 flex-1">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="skeleton h-4 w-3/4" />
      <div className="skeleton h-3 w-full" />
      <div className="skeleton h-3 w-2/3" />
      <div className="flex justify-between items-center">
        <div className="skeleton h-8 w-20" />
        <div className="skeleton h-8 w-24" />
      </div>
    </div>
  );
}
