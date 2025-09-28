import * as React from 'react';

interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
}

/**
 * Hook for monitoring component performance in development.
 * Tracks render count and timing to identify performance bottlenecks.
 */
export function usePerformanceMonitor(
  componentName: string
): PerformanceMetrics {
  const renderCountRef = React.useRef(0);
  const renderTimesRef = React.useRef<number[]>([]);
  const startTimeRef = React.useRef<number>(0);

  // Start timing at the beginning of render
  startTimeRef.current = performance.now();

  React.useEffect(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTimeRef.current;

    renderCountRef.current += 1;
    renderTimesRef.current.push(renderTime);

    // Keep only last 100 render times to prevent memory leaks
    if (renderTimesRef.current.length > 100) {
      renderTimesRef.current = renderTimesRef.current.slice(-100);
    }

    // Log performance warnings in development
    if (process.env.NODE_ENV === 'development') {
      if (renderTime > 16) {
        // More than one frame at 60fps
        console.warn(
          `🐌 Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`
        );
      }

      if (renderCountRef.current % 50 === 0) {
        const avgTime =
          renderTimesRef.current.reduce((a, b) => a + b, 0) /
          renderTimesRef.current.length;
        console.log(
          `📊 ${componentName} performance: ${renderCountRef.current} renders, avg ${avgTime.toFixed(2)}ms`
        );
      }
    }
  });

  const averageRenderTime = React.useMemo(() => {
    if (renderTimesRef.current.length === 0) return 0;
    return (
      renderTimesRef.current.reduce((a, b) => a + b, 0) /
      renderTimesRef.current.length
    );
  }, [renderTimesRef.current.length]);

  return {
    renderCount: renderCountRef.current,
    lastRenderTime:
      renderTimesRef.current[renderTimesRef.current.length - 1] || 0,
    averageRenderTime,
  };
}

/**
 * Hook for measuring the time taken by expensive operations.
 */
export function useOperationTimer() {
  const timerRef = React.useRef<{ [key: string]: number }>({});

  const startTimer = React.useCallback((operationName: string) => {
    timerRef.current[operationName] = performance.now();
  }, []);

  const endTimer = React.useCallback((operationName: string) => {
    const startTime = timerRef.current[operationName];
    if (startTime) {
      const duration = performance.now() - startTime;
      delete timerRef.current[operationName];

      if (process.env.NODE_ENV === 'development' && duration > 10) {
        console.log(`⏱️  ${operationName}: ${duration.toFixed(2)}ms`);
      }

      return duration;
    }
    return 0;
  }, []);

  return { startTimer, endTimer };
}
