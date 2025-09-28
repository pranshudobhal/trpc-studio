import * as React from 'react';

/**
 * Hook for debouncing search input to improve performance
 * and reduce unnecessary filtering operations.
 */
export function useDebouncedSearch(value: string, delay: number = 300): string {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
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
 * Hook for debounced search with loading state
 */
export function useDebouncedSearchWithLoading(
  value: string,
  delay: number = 300
): [string, boolean] {
  const [debouncedValue, setDebouncedValue] = React.useState(value);
  const [isSearching, setIsSearching] = React.useState(false);

  React.useEffect(() => {
    if (debouncedValue === value) {
      // Initial render or no change
      return;
    }

    setIsSearching(true);

    const handler = setTimeout(() => {
      setDebouncedValue(value);
      setIsSearching(false);
    }, delay);

    return () => {
      clearTimeout(handler);
      setIsSearching(false);
    };
  }, [value, delay, debouncedValue]);

  return [debouncedValue, isSearching];
}
