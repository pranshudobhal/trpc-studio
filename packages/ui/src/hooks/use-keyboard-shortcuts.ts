import * as React from 'react';

export interface KeyboardShortcut {
  /**
   * Key combination (e.g., 'ctrl+k', 'cmd+shift+p')
   */
  key: string;
  /**
   * Description of what the shortcut does
   */
  description: string;
  /**
   * Handler function
   */
  handler: (event: KeyboardEvent) => void;
  /**
   * Whether the shortcut is enabled
   */
  enabled?: boolean;
  /**
   * Whether to prevent default behavior
   */
  preventDefault?: boolean;
  /**
   * Whether to stop propagation
   */
  stopPropagation?: boolean;
}

/**
 * Parse key combination string into normalized format
 */
function parseKeyCombo(combo: string): {
  key: string;
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
} {
  const parts = combo.toLowerCase().split('+');
  const key = parts[parts.length - 1];

  return {
    key: key === 'space' ? ' ' : key,
    ctrl: parts.includes('ctrl'),
    meta: parts.includes('cmd') || parts.includes('meta'),
    alt: parts.includes('alt'),
    shift: parts.includes('shift'),
  };
}

/**
 * Check if keyboard event matches the key combination
 */
function matchesKeyCombo(
  event: KeyboardEvent,
  combo: ReturnType<typeof parseKeyCombo>
): boolean {
  const eventKey = event.key.toLowerCase();
  const comboKey = combo.key;

  // Handle special key mappings
  const keyMatches =
    eventKey === comboKey ||
    (comboKey === 'esc' && eventKey === 'escape') ||
    (comboKey === 'enter' && eventKey === 'enter') ||
    (comboKey === 'space' && eventKey === ' ');

  return (
    keyMatches &&
    event.ctrlKey === combo.ctrl &&
    event.metaKey === combo.meta &&
    event.altKey === combo.alt &&
    event.shiftKey === combo.shift
  );
}

/**
 * Hook for managing keyboard shortcuts
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: {
    /**
     * Whether shortcuts are globally active
     */
    enabled?: boolean;
    /**
     * Target element (defaults to document)
     */
    target?: HTMLElement | Document;
  } = {}
) {
  const { enabled = true, target = document } = options;

  const shortcutsRef = React.useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  React.useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in form elements
      const activeElement = document.activeElement;
      if (
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'SELECT' ||
          activeElement.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      for (const shortcut of shortcutsRef.current) {
        if (shortcut.enabled === false) continue;

        const combo = parseKeyCombo(shortcut.key);
        if (matchesKeyCombo(event, combo)) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          if (shortcut.stopPropagation) {
            event.stopPropagation();
          }

          shortcut.handler(event);
          break; // Only handle the first matching shortcut
        }
      }
    };

    target.addEventListener('keydown', handleKeyDown);
    return () => {
      target.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, target]);

  return {
    shortcuts: shortcuts.filter(s => s.enabled !== false),
  };
}

/**
 * Common keyboard shortcuts for tRPC Studio
 */
export const STUDIO_SHORTCUTS = {
  SEARCH: 'ctrl+k',
  SEARCH_MAC: 'cmd+k',
  ESCAPE: 'esc',
  TOGGLE_SIDEBAR: 'ctrl+b',
  TOGGLE_SIDEBAR_MAC: 'cmd+b',
  FOCUS_SEARCH: '/',
  EXECUTE_REQUEST: 'ctrl+enter',
  EXECUTE_REQUEST_MAC: 'cmd+enter',
  TOGGLE_JSON_MODE: 'ctrl+j',
  TOGGLE_JSON_MODE_MAC: 'cmd+j',
  CLEAR_RESPONSE: 'ctrl+l',
  CLEAR_RESPONSE_MAC: 'cmd+l',
} as const;

/**
 * Hook for common tRPC Studio shortcuts
 */
export function useStudioShortcuts(handlers: {
  onSearch?: () => void;
  onToggleSidebar?: () => void;
  onFocusSearch?: () => void;
  onExecuteRequest?: () => void;
  onToggleJsonMode?: () => void;
  onClearResponse?: () => void;
}) {
  const isMac = React.useMemo(() => {
    return (
      typeof navigator !== 'undefined' &&
      navigator.platform.toUpperCase().indexOf('MAC') >= 0
    );
  }, []);

  const shortcuts: KeyboardShortcut[] = React.useMemo(() => {
    const result: KeyboardShortcut[] = [];

    if (handlers.onSearch) {
      result.push({
        key: isMac ? STUDIO_SHORTCUTS.SEARCH_MAC : STUDIO_SHORTCUTS.SEARCH,
        description: 'Open search',
        handler: handlers.onSearch,
      });
    }

    if (handlers.onToggleSidebar) {
      result.push({
        key: isMac
          ? STUDIO_SHORTCUTS.TOGGLE_SIDEBAR_MAC
          : STUDIO_SHORTCUTS.TOGGLE_SIDEBAR,
        description: 'Toggle sidebar',
        handler: handlers.onToggleSidebar,
      });
    }

    if (handlers.onFocusSearch) {
      result.push({
        key: STUDIO_SHORTCUTS.FOCUS_SEARCH,
        description: 'Focus search',
        handler: handlers.onFocusSearch,
      });
    }

    if (handlers.onExecuteRequest) {
      result.push({
        key: isMac
          ? STUDIO_SHORTCUTS.EXECUTE_REQUEST_MAC
          : STUDIO_SHORTCUTS.EXECUTE_REQUEST,
        description: 'Execute request',
        handler: handlers.onExecuteRequest,
      });
    }

    if (handlers.onToggleJsonMode) {
      result.push({
        key: isMac
          ? STUDIO_SHORTCUTS.TOGGLE_JSON_MODE_MAC
          : STUDIO_SHORTCUTS.TOGGLE_JSON_MODE,
        description: 'Toggle JSON mode',
        handler: handlers.onToggleJsonMode,
      });
    }

    if (handlers.onClearResponse) {
      result.push({
        key: isMac
          ? STUDIO_SHORTCUTS.CLEAR_RESPONSE_MAC
          : STUDIO_SHORTCUTS.CLEAR_RESPONSE,
        description: 'Clear response',
        handler: handlers.onClearResponse,
      });
    }

    return result;
  }, [handlers, isMac]);

  useKeyboardShortcuts(shortcuts);

  return {
    shortcuts,
    isMac,
  };
}
