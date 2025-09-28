import { renderHook, act } from '@testing-library/react';
import { useKeyboardNavigation } from '../use-keyboard-navigation';
import { vi } from 'vitest';

describe('useKeyboardNavigation', () => {
  const createMockEvent = (key: string, options: Partial<KeyboardEvent> = {}) =>
    ({
      nativeEvent: {
        key,
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        shiftKey: false,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        ...options,
      },
    }) as any;

  it('should initialize with activeIndex 0', () => {
    const { result } = renderHook(() => useKeyboardNavigation(5));

    expect(result.current.activeIndex).toBe(0);
  });

  it('should move to next item with arrow down', () => {
    const { result } = renderHook(() => useKeyboardNavigation(5));

    act(() => {
      result.current.keyDownHandler(createMockEvent('ArrowDown'));
    });

    expect(result.current.activeIndex).toBe(1);
  });

  it('should move to previous item with arrow up', () => {
    const { result } = renderHook(() => useKeyboardNavigation(5));

    // First move to index 1
    act(() => {
      result.current.setActiveIndex(1);
    });

    act(() => {
      result.current.keyDownHandler(createMockEvent('ArrowUp'));
    });

    expect(result.current.activeIndex).toBe(0);
  });

  it('should move to first item with Home key', () => {
    const { result } = renderHook(() => useKeyboardNavigation(5));

    // First move to index 3
    act(() => {
      result.current.setActiveIndex(3);
    });

    act(() => {
      result.current.keyDownHandler(createMockEvent('Home'));
    });

    expect(result.current.activeIndex).toBe(0);
  });

  it('should move to last item with End key', () => {
    const { result } = renderHook(() => useKeyboardNavigation(5));

    act(() => {
      result.current.keyDownHandler(createMockEvent('End'));
    });

    expect(result.current.activeIndex).toBe(4);
  });

  it('should wrap around when loop is enabled', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation(3, { loop: true })
    );

    // Move to last item
    act(() => {
      result.current.setActiveIndex(2);
    });

    // Move down should wrap to first
    act(() => {
      result.current.keyDownHandler(createMockEvent('ArrowDown'));
    });

    expect(result.current.activeIndex).toBe(0);
  });

  it('should not move beyond bounds when loop is disabled', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation(3, { loop: false })
    );

    // Move to last item
    act(() => {
      result.current.setActiveIndex(2);
    });

    // Move down should stay at last
    act(() => {
      result.current.keyDownHandler(createMockEvent('ArrowDown'));
    });

    expect(result.current.activeIndex).toBe(2);
  });

  it('should provide correct item props', () => {
    const { result } = renderHook(() => useKeyboardNavigation(3));

    const itemProps0 = result.current.getItemProps(0);
    const itemProps1 = result.current.getItemProps(1);

    expect(itemProps0.tabIndex).toBe(0); // Active item
    expect(itemProps1.tabIndex).toBe(-1); // Inactive item
    expect(itemProps0['data-index']).toBe(0);
    expect(itemProps1['data-index']).toBe(1);
  });

  it('should call custom onKeyDown handler', () => {
    const onKeyDown = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation(3, { onKeyDown })
    );

    act(() => {
      const mockEvent = createMockEvent('ArrowDown');
      result.current.keyDownHandler(mockEvent);
    });

    expect(onKeyDown).toHaveBeenCalledWith(mockEvent.nativeEvent, 0);
  });

  it('should handle horizontal orientation', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation(3, { orientation: 'horizontal' })
    );

    act(() => {
      result.current.keyDownHandler(createMockEvent('ArrowRight'));
    });

    expect(result.current.activeIndex).toBe(1);

    act(() => {
      result.current.keyDownHandler(createMockEvent('ArrowLeft'));
    });

    expect(result.current.activeIndex).toBe(0);
  });
});
