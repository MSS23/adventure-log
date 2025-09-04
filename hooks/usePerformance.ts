import { useCallback, useMemo, useRef, useEffect, useState } from "react";

/**
 * Hook for debouncing values to prevent excessive re-renders
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for debouncing callbacks to prevent excessive API calls
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const debouncedCallback = useMemo(() => {
    let timeoutId: NodeJS.Timeout;

    const debounced = (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    };

    debounced.cancel = () => clearTimeout(timeoutId);
    return debounced;
  }, [delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedCallback.cancel();
    };
  }, [debouncedCallback]);

  return debouncedCallback as T;
}

/**
 * Hook for throttling callbacks to limit execution frequency
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const callbackRef = useRef(callback);
  const lastCallTime = useRef<number>(0);

  callbackRef.current = callback;

  const throttledCallback = useCallback(
    (...args: any[]) => {
      const now = Date.now();
      if (now - lastCallTime.current >= delay) {
        lastCallTime.current = now;
        return callbackRef.current(...args);
      }
    },
    [delay]
  );

  return throttledCallback as T;
}

/**
 * Hook for measuring component render performance
 */
export function useRenderPerformance(componentName: string) {
  const renderStart = useRef<number>();
  const renderCount = useRef(0);

  // Mark render start
  renderStart.current = performance.now();
  renderCount.current++;

  useEffect(() => {
    if (renderStart.current) {
      const renderTime = performance.now() - renderStart.current;

      if (renderTime > 16) {
        // More than 16ms (60fps threshold)
        console.warn(
          `🐌 Slow render: ${componentName} took ${renderTime.toFixed(2)}ms (render #${renderCount.current})`
        );
      } else if (process.env.NODE_ENV === "development") {
        console.debug(
          `⚡ ${componentName} rendered in ${renderTime.toFixed(2)}ms (render #${renderCount.current})`
        );
      }
    }
  });

  return {
    renderCount: renderCount.current,
    markRenderComplete: useCallback(() => {
      if (renderStart.current) {
        const renderTime = performance.now() - renderStart.current;
        return renderTime;
      }
      return 0;
    }, []),
  };
}

/**
 * Hook for lazy loading images with intersection observer
 */
export function useLazyImage(src: string, options?: IntersectionObserverInit) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, ...options }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [options]);

  useEffect(() => {
    if (isInView && src && !isLoaded) {
      const img = new Image();
      img.onload = () => setIsLoaded(true);
      img.src = src;
    }
  }, [isInView, src, isLoaded]);

  return {
    ref: imgRef,
    src: isLoaded ? src : undefined,
    isLoaded,
    isInView,
  };
}

/**
 * Hook for virtual scrolling to handle large lists efficiently
 */
export function useVirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 3,
}: {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight),
    items.length
  );

  const startIndex = Math.max(0, visibleStart - overscan);
  const endIndex = Math.min(items.length, visibleEnd + overscan);

  const visibleItems = useMemo(
    () =>
      items.slice(startIndex, endIndex).map((item, index) => ({
        item,
        index: startIndex + index,
      })),
    [items, startIndex, endIndex]
  );

  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
  };
}

/**
 * Hook for memoizing expensive calculations
 */
export function useExpensiveComputation<T, Args extends readonly unknown[]>(
  computeFn: (...args: Args) => T,
  deps: Args
): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => computeFn(...deps), deps);
}

/**
 * Hook for preventing unnecessary re-renders when objects haven't changed
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback((...args: any[]) => {
    return callbackRef.current(...args);
  }, []) as T;
}

/**
 * Hook for tracking component mount/unmount for memory leak detection
 */
export function useComponentTracking(componentName: string) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.debug(`🔧 ${componentName} mounted`);

      return () => {
        console.debug(`🔧 ${componentName} unmounted`);
      };
    }
  }, [componentName]);
}
