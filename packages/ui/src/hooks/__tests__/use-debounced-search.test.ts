import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useDebouncedSearch,
  useDebouncedSearchWithLoading,
} from '../use-debounced-search';

describe('useDebouncedSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedSearch('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedSearch(value, 300),
      { initialProps: { value: 'initial' } }
    );

    expect(result.current).toBe('initial');

    // Change value
    rerender({ value: 'updated' });
    expect(result.current).toBe('initial'); // Should still be initial

    // Fast forward time but not enough
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('initial');

    // Fast forward past debounce delay
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current).toBe('updated');
  });

  it('should reset timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedSearch(value, 300),
      { initialProps: { value: 'initial' } }
    );

    // Rapid changes
    rerender({ value: 'change1' });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: 'change2' });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: 'final' });

    // Should still be initial after 200ms total
    expect(result.current).toBe('initial');

    // After full delay from last change
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('final');
  });
});

describe('useDebouncedSearchWithLoading', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return loading state during debounce', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedSearchWithLoading(value, 300),
      { initialProps: { value: 'initial' } }
    );

    const [initialValue, initialLoading] = result.current;
    expect(initialValue).toBe('initial');
    expect(initialLoading).toBe(false);

    // Change value
    rerender({ value: 'updated' });
    const [updatedValue, updatedLoading] = result.current;
    expect(updatedValue).toBe('initial'); // Still old value
    expect(updatedLoading).toBe(true); // Should be loading

    // After debounce
    act(() => {
      vi.advanceTimersByTime(300);
    });
    const [finalValue, finalLoading] = result.current;
    expect(finalValue).toBe('updated');
    expect(finalLoading).toBe(false);
  });
});
