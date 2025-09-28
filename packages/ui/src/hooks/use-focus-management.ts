import * as React from 'react';

export interface FocusManagementOptions {
  /**
   * Whether to restore focus when the component unmounts
   */
  restoreFocus?: boolean;
  /**
   * Whether to trap focus within the container
   */
  trapFocus?: boolean;
  /**
   * Whether to focus the first element on mount
   */
  autoFocus?: boolean;
  /**
   * Selector for focusable elements
   */
  focusableSelector?: string;
}

/**
 * Default selector for focusable elements
 */
const DEFAULT_FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

/**
 * Hook for managing focus within a container (useful for modals, dialogs, etc.)
 */
export function useFocusManagement(
  containerRef: React.RefObject<HTMLElement>,
  isActive: boolean = true,
  options: FocusManagementOptions = {}
) {
  const {
    restoreFocus = true,
    trapFocus = false,
    autoFocus = false,
    focusableSelector = DEFAULT_FOCUSABLE_SELECTOR,
  } = options;

  const previousActiveElementRef = React.useRef<HTMLElement | null>(null);

  // Get all focusable elements within the container
  const getFocusableElements = React.useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];

    const elements = containerRef.current.querySelectorAll(focusableSelector);
    return Array.from(elements).filter((element): element is HTMLElement => {
      return element instanceof HTMLElement && isElementVisible(element);
    });
  }, [containerRef, focusableSelector]);

  // Check if element is visible and not hidden
  const isElementVisible = (element: HTMLElement): boolean => {
    const style = window.getComputedStyle(element);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      element.offsetWidth > 0 &&
      element.offsetHeight > 0
    );
  };

  // Focus the first focusable element
  const focusFirst = React.useCallback(() => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
      return true;
    }
    return false;
  }, [getFocusableElements]);

  // Focus the last focusable element
  const focusLast = React.useCallback(() => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1].focus();
      return true;
    }
    return false;
  }, [getFocusableElements]);

  // Handle tab key for focus trapping
  const handleKeyDown = React.useCallback(
    (event: KeyboardEvent) => {
      if (!trapFocus || !isActive || event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement;

      if (event.shiftKey) {
        // Shift + Tab: moving backwards
        if (
          activeElement === firstElement ||
          !focusableElements.includes(activeElement)
        ) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: moving forwards
        if (
          activeElement === lastElement ||
          !focusableElements.includes(activeElement)
        ) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [trapFocus, isActive, getFocusableElements]
  );

  // Store the previously focused element when becoming active
  React.useEffect(() => {
    if (isActive) {
      previousActiveElementRef.current = document.activeElement as HTMLElement;

      if (autoFocus) {
        // Small delay to ensure the container is rendered
        const timeoutId = setTimeout(() => {
          focusFirst();
        }, 0);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [isActive, autoFocus, focusFirst]);

  // Set up focus trap event listener
  React.useEffect(() => {
    if (trapFocus && isActive) {
      document.addEventListener('keydown', handleKeyDown, true);
      return () => {
        document.removeEventListener('keydown', handleKeyDown, true);
      };
    }
  }, [trapFocus, isActive, handleKeyDown]);

  // Restore focus when becoming inactive or unmounting
  React.useEffect(() => {
    return () => {
      if (restoreFocus && previousActiveElementRef.current) {
        // Small delay to ensure the container is removed from DOM
        setTimeout(() => {
          if (
            previousActiveElementRef.current &&
            document.contains(previousActiveElementRef.current)
          ) {
            previousActiveElementRef.current.focus();
          }
        }, 0);
      }
    };
  }, [restoreFocus]);

  return {
    focusFirst,
    focusLast,
    getFocusableElements,
  };
}

/**
 * Hook for managing focus visible state (keyboard vs mouse focus)
 */
export function useFocusVisible() {
  const [isFocusVisible, setIsFocusVisible] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  const hadKeyboardEventRef = React.useRef(false);

  // Track keyboard events
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab' || event.key === 'Enter' || event.key === ' ') {
        hadKeyboardEventRef.current = true;
      }
    };

    const handlePointerDown = () => {
      hadKeyboardEventRef.current = false;
    };

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('mousedown', handlePointerDown, true);
    document.addEventListener('pointerdown', handlePointerDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('mousedown', handlePointerDown, true);
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, []);

  const focusProps = React.useMemo(
    () => ({
      onFocus: () => {
        setIsFocused(true);
        setIsFocusVisible(hadKeyboardEventRef.current);
      },
      onBlur: () => {
        setIsFocused(false);
        setIsFocusVisible(false);
      },
    }),
    []
  );

  return {
    isFocusVisible: isFocusVisible && isFocused,
    isFocused,
    focusProps,
  };
}

/**
 * Hook for managing roving tabindex pattern
 */
export function useRovingTabIndex(
  items: Array<{ id: string; disabled?: boolean }>,
  activeId?: string
) {
  const [currentActiveId, setCurrentActiveId] = React.useState(
    activeId || items.find(item => !item.disabled)?.id || ''
  );

  // Update active id when prop changes
  React.useEffect(() => {
    if (activeId !== undefined) {
      setCurrentActiveId(activeId);
    }
  }, [activeId]);

  const getTabIndex = React.useCallback(
    (id: string): number => {
      return id === currentActiveId ? 0 : -1;
    },
    [currentActiveId]
  );

  const setActiveId = React.useCallback(
    (id: string) => {
      const item = items.find(item => item.id === id);
      if (item && !item.disabled) {
        setCurrentActiveId(id);
      }
    },
    [items]
  );

  return {
    activeId: currentActiveId,
    setActiveId,
    getTabIndex,
  };
}
