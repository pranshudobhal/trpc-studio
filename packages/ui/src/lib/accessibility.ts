/**
 * Accessibility utilities for tRPC Studio
 */

/**
 * Generate a unique ID for accessibility purposes
 */
export function generateId(prefix: string = 'trpc-studio'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Announce text to screen readers
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.setAttribute('class', 'sr-only');
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Get accessible name for an element
 */
export function getAccessibleName(element: HTMLElement): string {
  // Check aria-label first
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;

  // Check aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelElement = document.getElementById(labelledBy);
    if (labelElement) return labelElement.textContent || '';
  }

  // Check associated label
  if (
    element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA' ||
    element.tagName === 'SELECT'
  ) {
    const id = element.getAttribute('id');
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) return label.textContent || '';
    }
  }

  // Fall back to text content
  return element.textContent || '';
}

/**
 * Check if an element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  // Check if element is disabled
  if (element.hasAttribute('disabled')) return false;

  // Check tabindex
  const tabIndex = element.getAttribute('tabindex');
  if (tabIndex === '-1') return false;
  if (tabIndex && parseInt(tabIndex) >= 0) return true;

  // Check naturally focusable elements
  const focusableElements = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];

  if (focusableElements.includes(element.tagName)) {
    return true;
  }

  // Check contenteditable
  if (element.getAttribute('contenteditable') === 'true') {
    return true;
  }

  return false;
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(', ');

  const elements = container.querySelectorAll(selector);
  return Array.from(elements).filter((element): element is HTMLElement => {
    return element instanceof HTMLElement && isVisible(element);
  });
}

/**
 * Check if an element is visible
 */
export function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    element.offsetWidth > 0 &&
    element.offsetHeight > 0
  );
}

/**
 * Create a visually hidden element for screen readers
 */
export function createScreenReaderOnly(text: string): HTMLElement {
  const element = document.createElement('span');
  element.className = 'sr-only';
  element.textContent = text;
  return element;
}

/**
 * ARIA live region manager
 */
export class LiveRegionManager {
  private politeRegion: HTMLElement | null = null;
  private assertiveRegion: HTMLElement | null = null;

  constructor() {
    this.createRegions();
  }

  private createRegions(): void {
    // Create polite region
    this.politeRegion = document.createElement('div');
    this.politeRegion.setAttribute('aria-live', 'polite');
    this.politeRegion.setAttribute('aria-atomic', 'true');
    this.politeRegion.className = 'sr-only';
    document.body.appendChild(this.politeRegion);

    // Create assertive region
    this.assertiveRegion = document.createElement('div');
    this.assertiveRegion.setAttribute('aria-live', 'assertive');
    this.assertiveRegion.setAttribute('aria-atomic', 'true');
    this.assertiveRegion.className = 'sr-only';
    document.body.appendChild(this.assertiveRegion);
  }

  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const region =
      priority === 'assertive' ? this.assertiveRegion : this.politeRegion;
    if (region) {
      region.textContent = message;

      // Clear after announcement
      setTimeout(() => {
        if (region) region.textContent = '';
      }, 1000);
    }
  }

  destroy(): void {
    if (this.politeRegion) {
      document.body.removeChild(this.politeRegion);
      this.politeRegion = null;
    }
    if (this.assertiveRegion) {
      document.body.removeChild(this.assertiveRegion);
      this.assertiveRegion = null;
    }
  }
}

/**
 * Keyboard event utilities
 */
export const KeyboardUtils = {
  /**
   * Check if event is an activation key (Enter or Space)
   */
  isActivationKey(event: KeyboardEvent): boolean {
    return event.key === 'Enter' || event.key === ' ';
  },

  /**
   * Check if event is an arrow key
   */
  isArrowKey(event: KeyboardEvent): boolean {
    return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(
      event.key
    );
  },

  /**
   * Check if event is a navigation key
   */
  isNavigationKey(event: KeyboardEvent): boolean {
    return [
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'Home',
      'End',
      'PageUp',
      'PageDown',
      'Tab',
    ].includes(event.key);
  },

  /**
   * Check if event should trigger type-ahead search
   */
  isTypeAheadKey(event: KeyboardEvent): boolean {
    return (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      /^[a-zA-Z0-9]$/.test(event.key)
    );
  },
};

/**
 * ARIA attributes builder
 */
export class AriaAttributesBuilder {
  private attributes: Record<string, string | boolean | number> = {};

  label(value: string): this {
    this.attributes['aria-label'] = value;
    return this;
  }

  labelledBy(id: string): this {
    this.attributes['aria-labelledby'] = id;
    return this;
  }

  describedBy(id: string): this {
    this.attributes['aria-describedby'] = id;
    return this;
  }

  expanded(value: boolean): this {
    this.attributes['aria-expanded'] = value;
    return this;
  }

  selected(value: boolean): this {
    this.attributes['aria-selected'] = value;
    return this;
  }

  pressed(value: boolean): this {
    this.attributes['aria-pressed'] = value;
    return this;
  }

  checked(value: boolean | 'mixed'): this {
    this.attributes['aria-checked'] = value;
    return this;
  }

  disabled(value: boolean): this {
    this.attributes['aria-disabled'] = value;
    return this;
  }

  hidden(value: boolean): this {
    this.attributes['aria-hidden'] = value;
    return this;
  }

  hasPopup(
    value: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog'
  ): this {
    this.attributes['aria-haspopup'] = value;
    return this;
  }

  controls(id: string): this {
    this.attributes['aria-controls'] = id;
    return this;
  }

  owns(id: string): this {
    this.attributes['aria-owns'] = id;
    return this;
  }

  role(value: string): this {
    this.attributes['role'] = value;
    return this;
  }

  tabIndex(value: number): this {
    this.attributes['tabIndex'] = value;
    return this;
  }

  build(): Record<string, string | boolean | number> {
    return { ...this.attributes };
  }
}

/**
 * Create ARIA attributes builder
 */
export function aria(): AriaAttributesBuilder {
  return new AriaAttributesBuilder();
}
