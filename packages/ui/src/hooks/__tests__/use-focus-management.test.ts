import { renderHook, act } from '@testing-library/react';
import { useFocusVisible, useRovingTabIndex } from '../use-focus-management';

describe('useFocusVisible', () => {
  it('should initialize with focus not visible', () => {
    const { result } = renderHook(() => useFocusVisible());

    expect(result.current.isFocusVisible).toBe(false);
    expect(result.current.isFocused).toBe(false);
  });

  it('should provide focus props', () => {
    const { result } = renderHook(() => useFocusVisible());

    expect(result.current.focusProps).toHaveProperty('onFocus');
    expect(result.current.focusProps).toHaveProperty('onBlur');
    expect(typeof result.current.focusProps.onFocus).toBe('function');
    expect(typeof result.current.focusProps.onBlur).toBe('function');
  });
});

describe('useRovingTabIndex', () => {
  const items = [
    { id: 'item1' },
    { id: 'item2', disabled: true },
    { id: 'item3' },
  ];

  it('should initialize with first non-disabled item active', () => {
    const { result } = renderHook(() => useRovingTabIndex(items));

    expect(result.current.activeId).toBe('item1');
  });

  it('should provide correct tab index for items', () => {
    const { result } = renderHook(() => useRovingTabIndex(items));

    expect(result.current.getTabIndex('item1')).toBe(0);
    expect(result.current.getTabIndex('item2')).toBe(-1);
    expect(result.current.getTabIndex('item3')).toBe(-1);
  });

  it('should not set disabled item as active', () => {
    const { result } = renderHook(() => useRovingTabIndex(items));

    // Try to set disabled item as active
    result.current.setActiveId('item2');

    // Should remain on the original active item
    expect(result.current.activeId).toBe('item1');
  });

  it('should set non-disabled item as active', () => {
    const { result } = renderHook(() => useRovingTabIndex(items));

    act(() => {
      result.current.setActiveId('item3');
    });

    expect(result.current.activeId).toBe('item3');
    expect(result.current.getTabIndex('item1')).toBe(-1);
    expect(result.current.getTabIndex('item3')).toBe(0);
  });

  it('should use provided activeId prop', () => {
    const { result } = renderHook(() => useRovingTabIndex(items, 'item3'));

    expect(result.current.activeId).toBe('item3');
  });
});
