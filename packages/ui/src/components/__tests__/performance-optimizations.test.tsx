import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RouterNode, ProcedureNode } from '@trpc-studio/core';
import { OptimizedProcedureDetails } from '../optimized-procedure-details';
import { OptimizedSchemaDisplay } from '../optimized-schema-display';
import { VirtualizedRouterTree } from '../virtualized-router-tree';

// Mock react-window
vi.mock('react-window', () => ({
  FixedSizeList: ({ children, itemCount }: any) => {
    const items = Array.from(
      { length: Math.min(itemCount, 10) },
      (_, index) => {
        const Child = children;
        return <Child key={index} index={index} style={{}} />;
      }
    );
    return <div data-testid="virtualized-list">{items}</div>;
  },
}));

// Mock the ProcedureDetails component
vi.mock('../procedure-details', () => ({
  ProcedureDetails: vi.fn(() => (
    <div data-testid="procedure-details">Procedure Details</div>
  )),
}));

// Mock the SchemaDisplay component
vi.mock('../schema-display', () => ({
  SchemaDisplay: vi.fn(() => (
    <div data-testid="schema-display">Schema Display</div>
  )),
}));

const mockRouter: RouterNode = {
  name: 'test',
  procedures: [],
  children: [],
};

const mockProcedure: ProcedureNode = {
  name: 'testProcedure',
  type: 'query',
  input: { type: 'string' },
  output: { type: 'string' },
  meta: {
    summary: 'Test procedure',
    description: 'A test procedure',
  },
};

describe('Performance Optimizations', () => {
  describe('Component Exports', () => {
    it('should export optimized components', () => {
      expect(OptimizedProcedureDetails).toBeDefined();
      expect(OptimizedSchemaDisplay).toBeDefined();
      expect(VirtualizedRouterTree).toBeDefined();
    });
  });

  describe('VirtualizedRouterTree', () => {
    it('should render virtualized list for large datasets', () => {
      const largeRouterList: RouterNode[] = Array.from(
        { length: 200 },
        (_, i) => ({
          name: `router-${i}`,
          procedures: [
            {
              name: `procedure-${i}`,
              type: 'query' as const,
            },
          ],
          children: [],
        })
      );

      render(
        <VirtualizedRouterTree
          routers={largeRouterList}
          expandedRouters={new Set()}
          onToggleRouter={vi.fn()}
          onProcedureSelect={vi.fn()}
          height={400}
        />
      );

      // Should render virtualized list instead of all items
      expect(screen.getByTestId('virtualized-list')).toBeDefined();
    });

    it('should handle empty router list', () => {
      render(
        <VirtualizedRouterTree
          routers={[]}
          expandedRouters={new Set()}
          onToggleRouter={vi.fn()}
          onProcedureSelect={vi.fn()}
          height={400}
        />
      );

      expect(screen.getByText('No procedures found')).toBeDefined();
    });
  });

  describe('OptimizedSchemaDisplay', () => {
    it('should render with schema', () => {
      const schema = { type: 'string' as const };

      render(<OptimizedSchemaDisplay schema={schema} title="Test Schema" />);

      expect(screen.getByText('Test Schema')).toBeDefined();
      expect(screen.getByTestId('schema-display')).toBeDefined();
    });

    it('should handle missing schema', () => {
      render(<OptimizedSchemaDisplay schema={undefined} title="Test Schema" />);

      expect(screen.getByText('Test Schema')).toBeDefined();
      expect(screen.getByText('No schema available')).toBeDefined();
    });
  });

  describe('OptimizedProcedureDetails', () => {
    it('should render procedure details', () => {
      render(
        <OptimizedProcedureDetails
          router={mockRouter}
          procedure={mockProcedure}
          trpcEndpoint="/api/trpc"
        />
      );

      expect(screen.getByTestId('procedure-details')).toBeDefined();
    });
  });
});
