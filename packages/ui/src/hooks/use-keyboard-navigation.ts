import * as React from 'react';

export interface KeyboardNavigationOptions {
  /**
   * Whether to enable arrow key navigation
   */
  enableArrowKeys?: boolean;
  /**
   * Whether to enable home/end key navigation
   */
  enableHomeEnd?: boolean;
  /**
   * Whether to enable page up/down navigation
   */
  enablePageKeys?: boolean;
  /**
   * Whether to enable type-ahead search
   */
  enableTypeAhead?: boolean;
  /**
   * Orientation of the navigation (affects arrow key behavior)
   */
  orientation?: 'horizontal' | 'vertical' | 'both';
  /**
   * Whether to loop navigation (wrap around at ends)
   */
  loop?: boolean;
  /**
   * Custom key handlers
   */
  onKeyDown?: (event: KeyboardEvent, activeIndex: number) => boolean | void;
}

export interface KeyboardNavigationResult {
  /**
   * Current active index
   */
  activeIndex: number;
  /**
   * Set the active index
   */
  setActiveIndex: (index: number) => void;
  /**
   * Key down handler to attach to the container
   */
  keyDownHandler: (event: React.KeyboardEvent) => void;
  /**
   * Get props for a navigable item
   */
  getItemProps: (index: number) => {
    tabIndex: number;
    'data-index': number;
    onFocus: () => void;
  };
}

/**
 * Hook for implementing keyboard navigation in lists, trees, and other collections
 */
export function useKeyboardNavigation(
  itemCount: number,
  options: KeyboardNavigationOptions = {}
): KeyboardNavigationResult {
  const {
    enableArrowKeys = true,
    enableHomeEnd = true,
    enablePageKeys = false,
    enableTypeAhead = false,
    orientation = 'vertical',
    loop = false,
    onKeyDown,
  } = options;

  const [activeIndex, setActiveIndex] = React.useState(0);
  const typeAheadRef = React.useRef('');
  const typeAheadTimeoutRef = React.useRef<NodeJS.Timeout>();

  // Clamp index to valid range
  const clampIndex = React.useCallback(
    (index: number): number => {
      if (itemCount === 0) return -1;
      if (loop) {
        return ((index % itemCount) + itemCount) % itemCount;
      }
      return Math.max(0, Math.min(itemCount - 1, index));
    },
    [itemCount, loop]
  );

  // Move to next/previous item
  const moveToIndex = React.useCallback(
    (newIndex: number) => {
      const clampedIndex = clampIndex(newIndex);
      if (clampedIndex !== activeIndex && clampedIndex >= 0) {
        setActiveIndex(clampedIndex);
      }
    },
    [activeIndex, clampIndex]
  );

  // Handle type-ahead search
  const handleTypeAhead = React.useCallback(
    (char: string) => {
      if (!enableTypeAhead) return false;

      // Clear previous timeout
      if (typeAheadTimeoutRef.current) {
        clearTimeout(typeAheadTimeoutRef.current);
      }

      // Add character to search string
      typeAheadRef.current += char.toLowerCase();

      // Set timeout to clear search string
      typeAheadTimeoutRef.current = setTimeout(() => {
        typeAheadRef.current = '';
      }, 500);

      // Find matching item (this would need to be implemented by the consumer)
      // For now, we just return false to indicate no match found
      return false;
    },
    [enableTypeAhead]
  );

  // Main keyboard handler
  const keyDownHandler = React.useCallback(
    (event: React.KeyboardEvent) => {
      const { key, ctrlKey, metaKey, altKey, shiftKey } = event;

      // Allow custom handler to override
      if (onKeyDown) {
        const result = onKeyDown(event.nativeEvent, activeIndex);
        if (result === false) return; // Prevent default handling
      }

      let handled = false;

      // Arrow key navigation
      if (enableArrowKeys) {
        switch (key) {
          case 'ArrowDown':
            if (orientation === 'vertical' || orientation === 'both') {
              moveToIndex(activeIndex + 1);
              handled = true;
            }
            break;
          case 'ArrowUp':
            if (orientation === 'vertical' || orientation === 'both') {
              moveToIndex(activeIndex - 1);
              handled = true;
            }
            break;
          case 'ArrowRight':
            if (orientation === 'horizontal' || orientation === 'both') {
              moveToIndex(activeIndex + 1);
              handled = true;
            }
            break;
          case 'ArrowLeft':
            if (orientation === 'horizontal' || orientation === 'both') {
              moveToIndex(activeIndex - 1);
              handled = true;
            }
            break;
        }
      }

      // Home/End navigation
      if (enableHomeEnd && !handled) {
        switch (key) {
          case 'Home':
            if (!ctrlKey && !metaKey) {
              moveToIndex(0);
              handled = true;
            }
            break;
          case 'End':
            if (!ctrlKey && !metaKey) {
              moveToIndex(itemCount - 1);
              handled = true;
            }
            break;
        }
      }

      // Page navigation
      if (enablePageKeys && !handled) {
        const pageSize = Math.max(1, Math.floor(itemCount / 10)); // 10% of items
        switch (key) {
          case 'PageDown':
            moveToIndex(activeIndex + pageSize);
            handled = true;
            break;
          case 'PageUp':
            moveToIndex(activeIndex - pageSize);
            handled = true;
            break;
        }
      }

      // Type-ahead search
      if (
        !handled &&
        key &&
        key.length === 1 &&
        !ctrlKey &&
        !metaKey &&
        !altKey
      ) {
        handled = handleTypeAhead(key);
      }

      if (handled) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    [
      activeIndex,
      itemCount,
      enableArrowKeys,
      enableHomeEnd,
      enablePageKeys,
      orientation,
      moveToIndex,
      handleTypeAhead,
      onKeyDown,
    ]
  );

  // Get props for individual items
  const getItemProps = React.useCallback(
    (index: number) => ({
      tabIndex: index === activeIndex ? 0 : -1,
      'data-index': index,
      onFocus: () => setActiveIndex(index),
    }),
    [activeIndex]
  );

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (typeAheadTimeoutRef.current) {
        clearTimeout(typeAheadTimeoutRef.current);
      }
    };
  }, []);

  return {
    activeIndex,
    setActiveIndex: moveToIndex,
    keyDownHandler,
    getItemProps,
  };
}
