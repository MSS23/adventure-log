"use client";

import React, { memo, Suspense, lazy, forwardRef } from "react";
import { useVirtualScroll, useLazyImage } from "@/hooks/usePerformance";
import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

// Optimized Image component with lazy loading
interface OptimizedImageProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
  loading?: "lazy" | "eager";
}

export const OptimizedImage = memo(
  forwardRef<HTMLImageElement, OptimizedImageProps>(
    ({ src, alt, placeholder, className, loading = "lazy", ...props }, ref) => {
      const {
        ref: lazyRef,
        src: lazySrc,
        isLoaded,
        isInView,
      } = useLazyImage(src);

      return (
        <div className={cn("relative overflow-hidden", className)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={(node) => {
              if (typeof ref === "function") ref(node);
              else if (ref) ref.current = node;
              lazyRef.current = node;
            }}
            src={lazySrc || placeholder}
            alt={alt}
            loading={loading}
            className={cn(
              "transition-opacity duration-300",
              isLoaded ? "opacity-100" : "opacity-0"
            )}
            {...props}
          />
          {!isLoaded && isInView && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse" />
          )}
        </div>
      );
    }
  )
);

OptimizedImage.displayName = "OptimizedImage";

// Virtual scrolling list component
interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number;
}

export function VirtualList<T>({
  items,
  itemHeight,
  height,
  renderItem,
  className,
  overscan = 3,
}: VirtualListProps<T>) {
  const { visibleItems, totalHeight, offsetY, handleScroll } = useVirtualScroll(
    {
      items,
      itemHeight,
      containerHeight: height,
      overscan,
    }
  );

  return (
    <div
      className={cn("overflow-auto", className)}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map(({ item, index }) => (
            <div key={index} style={{ height: itemHeight }} className="w-full">
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Lazy loading wrapper component
interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
}

export const LazyWrapper = memo(
  ({
    children,
    fallback = <Skeleton className="h-48 w-full" />,
    threshold = 0.1,
    rootMargin = "50px",
  }: LazyWrapperProps) => {
    const [isVisible, setIsVisible] = React.useState(false);
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        },
        { threshold, rootMargin }
      );

      if (ref.current) {
        observer.observe(ref.current);
      }

      return () => observer.disconnect();
    }, [threshold, rootMargin]);

    return <div ref={ref}>{isVisible ? children : fallback}</div>;
  }
);

LazyWrapper.displayName = "LazyWrapper";

// Memoized list item to prevent unnecessary re-renders
interface ListItemProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const MemoizedListItem = memo<ListItemProps>(
  ({ children, className, onClick }) => (
    <div className={className} onClick={onClick}>
      {children}
    </div>
  )
);

MemoizedListItem.displayName = "MemoizedListItem";

// Throttled search input component
interface ThrottledSearchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  onSearch: (value: string) => void;
  delay?: number;
}

export const ThrottledSearch = memo(
  ({ onSearch, delay = 300, className, ...props }: ThrottledSearchProps) => {
    const [value, setValue] = React.useState("");
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setValue(newValue);

        // Clear existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // Set new timeout
        timeoutRef.current = setTimeout(() => {
          onSearch(newValue);
        }, delay);
      },
      [onSearch, delay]
    );

    React.useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    return (
      <input
        type="text"
        value={value}
        onChange={handleChange}
        className={className}
        {...props}
      />
    );
  }
);

ThrottledSearch.displayName = "ThrottledSearch";

// Lazy-loaded component factory
export function createLazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback: React.ComponentType = () => <Skeleton className="h-48 w-full" />
) {
  const LazyComponent = lazy(importFn);

  const LazyWrapper = memo((props: React.ComponentProps<T>) => {
    const FallbackComponent = fallback;
    return (
      <Suspense fallback={<FallbackComponent />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  });

  LazyWrapper.displayName = `LazyComponent(${importFn.toString()})`;

  return LazyWrapper;
}

// Optimized grid component for photo galleries
interface OptimizedGridProps {
  children: React.ReactNode[];
  columns: number;
  gap?: number;
  className?: string;
}

export const OptimizedGrid = memo<OptimizedGridProps>(
  ({ children, columns, gap = 4, className }) => {
    const gridCols = React.useMemo(() => {
      const colClasses: Record<number, string> = {
        1: "grid-cols-1",
        2: "grid-cols-2",
        3: "grid-cols-3",
        4: "grid-cols-4",
        5: "grid-cols-5",
        6: "grid-cols-6",
      };
      return colClasses[columns] || "grid-cols-3";
    }, [columns]);

    const gapClass = React.useMemo(() => {
      const gapClasses: Record<number, string> = {
        1: "gap-1",
        2: "gap-2",
        3: "gap-3",
        4: "gap-4",
        6: "gap-6",
        8: "gap-8",
      };
      return gapClasses[gap] || "gap-4";
    }, [gap]);

    return (
      <div className={cn("grid", gridCols, gapClass, className)}>
        {children.map((child, index) => (
          <div key={index}>{child}</div>
        ))}
      </div>
    );
  }
);

OptimizedGrid.displayName = "OptimizedGrid";

// Performance monitoring wrapper
interface PerformanceMonitorProps {
  children: React.ReactNode;
  componentName: string;
  enableInProduction?: boolean;
}

export const PerformanceMonitor = memo(
  ({
    children,
    componentName,
    enableInProduction = false,
  }: PerformanceMonitorProps) => {
    const renderStartTime = React.useRef<number>(0);
    const renderCount = React.useRef(0);

    // Only monitor in development or when explicitly enabled
    const shouldMonitor =
      process.env.NODE_ENV === "development" || enableInProduction;

    if (shouldMonitor) {
      renderStartTime.current = performance.now();
      renderCount.current++;
    }

    React.useEffect(() => {
      if (shouldMonitor && renderStartTime.current) {
        const renderTime = performance.now() - renderStartTime.current;

        if (renderTime > 16) {
          // More than 16ms (60fps threshold)
          console.warn(
            `🐌 Slow render: ${componentName} took ${renderTime.toFixed(2)}ms (render #${renderCount.current})`
          );
        }
      }
    });

    return <>{children}</>;
  }
);

PerformanceMonitor.displayName = "PerformanceMonitor";
