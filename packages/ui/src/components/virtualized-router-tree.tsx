import * as React from 'react';
import { FixedSizeList as List } from 'react-window';
import { RouterNode, ProcedureNode } from '@trpc-studio/core';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

export interface VirtualizedRouterTreeProps {
  routers: RouterNode[];
  expandedRouters: Set<string>;
  onToggleRouter: (routerName: string) => void;
  onProcedureSelect: (router: RouterNode, procedure: ProcedureNode) => void;
  selectedProcedure?: {
    router: RouterNode;
    procedure: ProcedureNode;
  } | null;
  height: number;
  className?: string;
}

interface TreeItem {
  type: 'router' | 'procedure';
  router: RouterNode;
  procedure?: ProcedureNode;
  level: number;
  id: string;
}

const ITEM_HEIGHT = 40;

/**
 * Virtualized router tree for handling large numbers of procedures efficiently.
 * Only renders visible items to maintain performance with large datasets.
 */
export const VirtualizedRouterTree = React.memo<VirtualizedRouterTreeProps>(
  ({
    routers,
    expandedRouters,
    onToggleRouter,
    onProcedureSelect,
    selectedProcedure,
    height,
    className,
  }) => {
    // Flatten the tree structure into a linear array for virtualization
    const flattenedItems = React.useMemo(() => {
      const items: TreeItem[] = [];

      const flattenRouter = (routerNodes: RouterNode[], level: number) => {
        routerNodes.forEach(router => {
          const hasChildren =
            router.children.length > 0 || router.procedures.length > 0;

          if (hasChildren) {
            items.push({
              type: 'router',
              router,
              level,
              id: `router-${router.name}`,
            });
          }

          const isExpanded = expandedRouters.has(router.name);
          if (isExpanded) {
            // Add procedures
            router.procedures.forEach(procedure => {
              items.push({
                type: 'procedure',
                router,
                procedure,
                level: level + 1,
                id: `procedure-${router.name}-${procedure.name}`,
              });
            });

            // Add child routers
            flattenRouter(router.children, level + 1);
          }
        });
      };

      flattenRouter(routers, 0);
      return items;
    }, [routers, expandedRouters]);

    const Row = React.memo<{ index: number; style: React.CSSProperties }>(
      ({ index, style }) => {
        const item = flattenedItems[index];
        if (!item) return null;

        const paddingLeft = item.level * 16 + 8;

        if (item.type === 'router') {
          const isExpanded = expandedRouters.has(item.router.name);

          return (
            <div style={style}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleRouter(item.router.name)}
                className="w-full justify-start text-left font-medium hover:bg-accent"
                style={{ paddingLeft }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 mr-1" />
                ) : (
                  <ChevronRight className="h-4 w-4 mr-1" />
                )}
                {item.router.name}
              </Button>
            </div>
          );
        }

        if (item.type === 'procedure' && item.procedure) {
          const isSelected =
            selectedProcedure?.router.name === item.router.name &&
            selectedProcedure?.procedure.name === item.procedure.name;

          return (
            <div style={style}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onProcedureSelect(item.router, item.procedure!)}
                className={cn(
                  'w-full justify-start text-left hover:bg-accent',
                  isSelected && 'bg-accent text-accent-foreground'
                )}
                style={{ paddingLeft }}
              >
                <div className="flex items-center gap-2 w-full">
                  <Badge
                    variant={
                      item.procedure.type === 'query' ? 'secondary' : 'default'
                    }
                    className="text-xs"
                  >
                    {item.procedure.type.toUpperCase()}
                  </Badge>
                  <span className="flex-1 truncate">{item.procedure.name}</span>
                  <div className="flex gap-1">
                    {item.procedure.meta?.deprecated && (
                      <Badge variant="destructive" className="text-xs">
                        Deprecated
                      </Badge>
                    )}
                    {item.procedure.meta?.visibility === 'internal' && (
                      <Badge variant="outline" className="text-xs">
                        Internal
                      </Badge>
                    )}
                  </div>
                </div>
              </Button>
            </div>
          );
        }

        return null;
      }
    );

    Row.displayName = 'VirtualizedTreeRow';

    if (flattenedItems.length === 0) {
      return (
        <div className={cn('flex items-center justify-center p-8', className)}>
          <p className="text-muted-foreground text-sm">No procedures found</p>
        </div>
      );
    }

    return (
      <div className={className}>
        <List
          height={height}
          itemCount={flattenedItems.length}
          itemSize={ITEM_HEIGHT}
          width="100%"
        >
          {Row}
        </List>
      </div>
    );
  }
);

VirtualizedRouterTree.displayName = 'VirtualizedRouterTree';
