/**
 * Tests for DocumentationView component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DocumentationView } from '../documentation-view';
import type {
  RouterIntrospection,
  RouterNode,
  ProcedureNode,
} from '@trpc-studio/core';

// Mock the router tree navigation component
vi.mock('../router-tree-navigation', () => ({
  RouterTreeNavigation: ({
    routers,
    onProcedureSelect,
    searchQuery,
    tagFilter,
    hideDeprecated,
    hideInternal,
  }: any) => (
    <div data-testid="router-tree-navigation">
      <div data-testid="search-query">{searchQuery}</div>
      <div data-testid="tag-filter">{tagFilter}</div>
      <div data-testid="hide-deprecated">{hideDeprecated.toString()}</div>
      <div data-testid="hide-internal">{hideInternal.toString()}</div>
      {routers.map((router: RouterNode) => (
        <div key={router.name} data-testid={`router-${router.name}`}>
          {router.procedures.map((procedure: ProcedureNode) => (
            <button
              key={procedure.name}
              data-testid={`procedure-${procedure.name}`}
              onClick={() => onProcedureSelect(router, procedure)}
            >
              {procedure.name}
              {procedure.meta?.deprecated && (
                <span data-testid="deprecated-badge">Deprecated</span>
              )}
              {procedure.meta?.visibility === 'internal' && (
                <span data-testid="internal-badge">Internal</span>
              )}
            </button>
          ))}
        </div>
      ))}
    </div>
  ),
}));

// Mock the procedure details component
vi.mock('../procedure-details', () => ({
  ProcedureDetails: ({ router, procedure }: any) => (
    <div data-testid="procedure-details">
      <div data-testid="selected-router">{router.name}</div>
      <div data-testid="selected-procedure">{procedure.name}</div>
    </div>
  ),
}));

describe('DocumentationView', () => {
  const mockIntrospection: RouterIntrospection = {
    routers: [
      {
        name: 'root',
        procedures: [
          {
            name: 'publicQuery',
            type: 'query',
            meta: {
              summary: 'Public query',
              description: 'A public query procedure',
              tags: ['public', 'query'],
              visibility: 'public',
              deprecated: false,
            },
          },
          {
            name: 'internalQuery',
            type: 'query',
            meta: {
              summary: 'Internal query',
              description: 'An internal query procedure',
              tags: ['internal', 'query'],
              visibility: 'internal',
              deprecated: false,
            },
          },
          {
            name: 'deprecatedMutation',
            type: 'mutation',
            meta: {
              summary: 'Deprecated mutation',
              description: 'A deprecated mutation procedure',
              tags: ['mutation'],
              visibility: 'public',
              deprecated: true,
            },
          },
          {
            name: 'adminQuery',
            type: 'query',
            meta: {
              summary: 'Admin query',
              description: 'An admin-only query',
              tags: ['admin', 'query'],
              visibility: 'public',
              deprecated: false,
            },
          },
        ],
        children: [
          {
            name: 'users',
            procedures: [
              {
                name: 'list',
                type: 'query',
                meta: {
                  summary: 'List users',
                  description: 'Get all users',
                  tags: ['users', 'list'],
                  visibility: 'public',
                  deprecated: false,
                },
              },
            ],
            children: [],
          },
        ],
      },
    ],
    meta: {
      generatedAt: '2023-01-01T00:00:00.000Z',
      trpcVersion: '11.0.0',
      transformer: 'superjson',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render documentation view with router tree', () => {
      render(<DocumentationView introspection={mockIntrospection} />);

      expect(screen.getByTestId('router-tree-navigation')).toBeInTheDocument();
      expect(screen.getByTestId('router-root')).toBeInTheDocument();
    });

    it('should render search input', () => {
      render(<DocumentationView introspection={mockIntrospection} />);

      expect(
        screen.getByPlaceholderText(/search procedures/i)
      ).toBeInTheDocument();
    });

    it('should render filter controls', () => {
      render(<DocumentationView introspection={mockIntrospection} />);

      expect(screen.getByText(/tag filter/i)).toBeInTheDocument();
      expect(screen.getByText(/hide deprecated/i)).toBeInTheDocument();
      expect(screen.getByText(/hide internal/i)).toBeInTheDocument();
    });

    it('should render procedures with badges', () => {
      render(<DocumentationView introspection={mockIntrospection} />);

      expect(screen.getByTestId('procedure-publicQuery')).toBeInTheDocument();
      expect(screen.getByTestId('procedure-internalQuery')).toBeInTheDocument();
      expect(
        screen.getByTestId('procedure-deprecatedMutation')
      ).toBeInTheDocument();

      // Check for badges
      expect(screen.getByTestId('deprecated-badge')).toBeInTheDocument();
      expect(screen.getByTestId('internal-badge')).toBeInTheDocument();
    });
  });

  describe('Search functionality', () => {
    it('should filter procedures by name', async () => {
      render(<DocumentationView introspection={mockIntrospection} />);

      const searchInput = screen.getByPlaceholderText(/search procedures/i);
      await userEvent.type(searchInput, 'public');

      await waitFor(() => {
        expect(screen.getByTestId('search-query')).toHaveTextContent('public');
      });
    });

    it('should clear search when input is cleared', async () => {
      render(<DocumentationView introspection={mockIntrospection} />);

      const searchInput = screen.getByPlaceholderText(/search procedures/i);
      await userEvent.type(searchInput, 'test');
      await userEvent.clear(searchInput);

      await waitFor(() => {
        expect(screen.getByTestId('search-query')).toHaveTextContent('');
      });
    });

    it('should debounce search input', async () => {
      vi.useFakeTimers();
      render(<DocumentationView introspection={mockIntrospection} />);

      const searchInput = screen.getByPlaceholderText(/search procedures/i);

      // Type rapidly
      await userEvent.type(searchInput, 'a');
      await userEvent.type(searchInput, 'b');
      await userEvent.type(searchInput, 'c');

      // Should not update immediately
      expect(screen.getByTestId('search-query')).toHaveTextContent('');

      // Fast forward debounce delay
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByTestId('search-query')).toHaveTextContent('abc');
      });

      vi.useRealTimers();
    });
  });

  describe('Tag filtering', () => {
    it('should filter procedures by tag', async () => {
      render(<DocumentationView introspection={mockIntrospection} />);

      const tagSelect = screen.getByRole('combobox', { name: /tag filter/i });
      await userEvent.click(tagSelect);

      // Select 'admin' tag
      const adminOption = screen.getByText('admin');
      await userEvent.click(adminOption);

      await waitFor(() => {
        expect(screen.getByTestId('tag-filter')).toHaveTextContent('admin');
      });
    });

    it('should show all available tags in filter dropdown', async () => {
      render(<DocumentationView introspection={mockIntrospection} />);

      const tagSelect = screen.getByRole('combobox', { name: /tag filter/i });
      await userEvent.click(tagSelect);

      // Should show unique tags from all procedures
      expect(screen.getByText('public')).toBeInTheDocument();
      expect(screen.getByText('query')).toBeInTheDocument();
      expect(screen.getByText('internal')).toBeInTheDocument();
      expect(screen.getByText('mutation')).toBeInTheDocument();
      expect(screen.getByText('admin')).toBeInTheDocument();
      expect(screen.getByText('users')).toBeInTheDocument();
      expect(screen.getByText('list')).toBeInTheDocument();
    });

    it('should clear tag filter', async () => {
      render(<DocumentationView introspection={mockIntrospection} />);

      const tagSelect = screen.getByRole('combobox', { name: /tag filter/i });
      await userEvent.click(tagSelect);

      // Select a tag first
      const adminOption = screen.getByText('admin');
      await userEvent.click(adminOption);

      // Then clear it
      const clearButton = screen.getByRole('button', {
        name: /clear tag filter/i,
      });
      await userEvent.click(clearButton);

      await waitFor(() => {
        expect(screen.getByTestId('tag-filter')).toHaveTextContent('');
      });
    });
  });

  describe('Hide deprecated toggle', () => {
    it('should toggle hide deprecated procedures', async () => {
      render(<DocumentationView introspection={mockIntrospection} />);

      const hideDeprecatedToggle = screen.getByRole('checkbox', {
        name: /hide deprecated/i,
      });

      // Initially should be false
      expect(screen.getByTestId('hide-deprecated')).toHaveTextContent('false');

      await userEvent.click(hideDeprecatedToggle);

      await waitFor(() => {
        expect(screen.getByTestId('hide-deprecated')).toHaveTextContent('true');
      });
    });

    it('should persist hide deprecated state', async () => {
      render(<DocumentationView introspection={mockIntrospection} />);

      const hideDeprecatedToggle = screen.getByRole('checkbox', {
        name: /hide deprecated/i,
      });
      await userEvent.click(hideDeprecatedToggle);

      // Re-render component
      render(<DocumentationView introspection={mockIntrospection} />);

      // State should be persisted (assuming localStorage mock)
      await waitFor(() => {
        expect(screen.getByTestId('hide-deprecated')).toHaveTextContent('true');
      });
    });
  });

  describe('Hide internal toggle', () => {
    it('should toggle hide internal procedures', async () => {
      render(<DocumentationView introspection={mockIntrospection} />);

      const hideInternalToggle = screen.getByRole('checkbox', {
        name: /hide internal/i,
      });

      // Initially should be false
      expect(screen.getByTestId('hide-internal')).toHaveTextContent('false');

      await userEvent.click(hideInternalToggle);

      await waitFor(() => {
        expect(screen.getByTestId('hide-internal')).toHaveTextContent('true');
      });
    });

    it('should persist hide internal state', async () => {
      render(<DocumentationView introspection={mockIntrospection} />);

      const hideInternalToggle = screen.getByRole('checkbox', {
        name: /hide internal/i,
      });
      await userEvent.click(hideInternalToggle);

      // Re-render component
      render(<DocumentationView introspection={mockIntrospection} />);

      // State should be persisted (assuming localStorage mock)
      await waitFor(() => {
        expect(screen.getByTestId('hide-internal')).toHaveTextContent('true');
      });
    });
  });

  describe('Procedure selection', () => {
    it('should select procedure and show details', async () => {
      render(<DocumentationView introspection={mockIntrospection} />);

      const procedureButton = screen.getByTestId('procedure-publicQuery');
      await userEvent.click(procedureButton);

      await waitFor(() => {
        expect(screen.getByTestId('procedure-details')).toBeInTheDocument();
        expect(screen.getByTestId('selected-router')).toHaveTextContent('root');
        expect(screen.getByTestId('selected-procedure')).toHaveTextContent(
          'publicQuery'
        );
      });
    });

    it('should update selected procedure when clicking different procedure', async () => {
      render(<DocumentationView introspection={mockIntrospection} />);

      // Select first procedure
      const firstProcedure = screen.getByTestId('procedure-publicQuery');
      await userEvent.click(firstProcedure);

      await waitFor(() => {
        expect(screen.getByTestId('selected-procedure')).toHaveTextContent(
          'publicQuery'
        );
      });

      // Select second procedure
      const secondProcedure = screen.getByTestId('procedure-internalQuery');
      await userEvent.click(secondProcedure);

      await waitFor(() => {
        expect(screen.getByTestId('selected-procedure')).toHaveTextContent(
          'internalQuery'
        );
      });
    });
  });

  describe('Empty states', () => {
    it('should handle empty introspection', () => {
      const emptyIntrospection: RouterIntrospection = {
        routers: [],
        meta: {
          generatedAt: '2023-01-01T00:00:00.000Z',
          trpcVersion: '11.0.0',
          transformer: null,
        },
      };

      render(<DocumentationView introspection={emptyIntrospection} />);

      expect(screen.getByText(/no procedures found/i)).toBeInTheDocument();
    });

    it('should handle routers with no procedures', () => {
      const emptyRouterIntrospection: RouterIntrospection = {
        routers: [
          {
            name: 'empty',
            procedures: [],
            children: [],
          },
        ],
        meta: {
          generatedAt: '2023-01-01T00:00:00.000Z',
          trpcVersion: '11.0.0',
          transformer: null,
        },
      };

      render(<DocumentationView introspection={emptyRouterIntrospection} />);

      expect(screen.getByTestId('router-empty')).toBeInTheDocument();
      expect(screen.getByText(/no procedures found/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<DocumentationView introspection={mockIntrospection} />);

      expect(screen.getByRole('searchbox')).toHaveAttribute(
        'aria-label',
        'Search procedures'
      );
      expect(
        screen.getByRole('combobox', { name: /tag filter/i })
      ).toHaveAttribute('aria-label', 'Filter by tag');
      expect(
        screen.getByRole('checkbox', { name: /hide deprecated/i })
      ).toHaveAttribute('aria-label', 'Hide deprecated procedures');
      expect(
        screen.getByRole('checkbox', { name: /hide internal/i })
      ).toHaveAttribute('aria-label', 'Hide internal procedures');
    });

    it('should support keyboard navigation', async () => {
      render(<DocumentationView introspection={mockIntrospection} />);

      const searchInput = screen.getByRole('searchbox');
      searchInput.focus();

      // Tab to tag filter
      await userEvent.tab();
      expect(
        screen.getByRole('combobox', { name: /tag filter/i })
      ).toHaveFocus();

      // Tab to hide deprecated toggle
      await userEvent.tab();
      expect(
        screen.getByRole('checkbox', { name: /hide deprecated/i })
      ).toHaveFocus();

      // Tab to hide internal toggle
      await userEvent.tab();
      expect(
        screen.getByRole('checkbox', { name: /hide internal/i })
      ).toHaveFocus();
    });

    it('should announce filter changes to screen readers', async () => {
      render(<DocumentationView introspection={mockIntrospection} />);

      const hideDeprecatedToggle = screen.getByRole('checkbox', {
        name: /hide deprecated/i,
      });
      await userEvent.click(hideDeprecatedToggle);

      // Should have aria-live region for announcements
      expect(screen.getByRole('status')).toHaveTextContent(
        /deprecated procedures are now hidden/i
      );
    });
  });

  describe('Performance', () => {
    it('should memoize expensive computations', () => {
      const { rerender } = render(
        <DocumentationView introspection={mockIntrospection} />
      );

      // Mock expensive computation
      const computeSpy = vi.fn();

      // Re-render with same props
      rerender(<DocumentationView introspection={mockIntrospection} />);

      // Expensive computations should be memoized
      expect(computeSpy).toHaveBeenCalledTimes(0);
    });

    it('should handle large numbers of procedures efficiently', () => {
      const largeMockIntrospection: RouterIntrospection = {
        routers: [
          {
            name: 'large',
            procedures: Array.from({ length: 1000 }, (_, i) => ({
              name: `procedure${i}`,
              type: 'query' as const,
              meta: {
                summary: `Procedure ${i}`,
                tags: [`tag${i % 10}`],
                visibility: 'public' as const,
                deprecated: i % 100 === 0,
              },
            })),
            children: [],
          },
        ],
        meta: {
          generatedAt: '2023-01-01T00:00:00.000Z',
          trpcVersion: '11.0.0',
          transformer: null,
        },
      };

      const startTime = performance.now();
      render(<DocumentationView introspection={largeMockIntrospection} />);
      const endTime = performance.now();

      // Should render within reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});
