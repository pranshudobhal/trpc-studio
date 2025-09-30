import * as React from 'react';
import { RouterNode, ProcedureNode, Visibility } from '@trpc-studio/core';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Toggle } from './ui/toggle';
import { ScrollArea } from './ui/scroll-area';
import { Search, ChevronRight, ChevronDown, Filter } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  useKeyboardNavigation,
  useFocusVisible,
  useStudioShortcuts,
  useDebouncedSearch,
} from '../hooks';
import { generateId, announceToScreenReader, aria } from '../lib/accessibility';
import { VirtualizedRouterTree } from './virtualized-router-tree';

export interface RouterTreeNavigationProps {
  routers: RouterNode[];
  onProcedureSelect: (router: RouterNode, procedure: ProcedureNode) => void;
  selectedProcedure?: {
    router: RouterNode;
    procedure: ProcedureNode;
  } | null;
}

interface FilterState {
  searchQuery: string;
  selectedTags: string[];
  hideDeprecated: boolean;
  hideInternal: boolean;
}

export const RouterTreeNavigation = React.memo<RouterTreeNavigationProps>(
  ({ routers, onProcedureSelect, selectedProcedure }) => {
    const [filters, setFilters] = React.useState<FilterState>({
      searchQuery: '',
      selectedTags: [],
      hideDeprecated: false,
      hideInternal: false,
    });

    const [expandedRouters, setExpandedRouters] = React.useState<Set<string>>(
      new Set()
    );

    // Debounce search query for better performance
    const debouncedSearchQuery = useDebouncedSearch(filters.searchQuery, 300);

    // Accessibility IDs
    const searchInputId = React.useMemo(() => generateId('search-input'), []);
    const treeId = React.useMemo(() => generateId('router-tree'), []);
    const filtersId = React.useMemo(() => generateId('filters'), []);

    // Search input ref for focus management
    const searchInputRef = React.useRef<HTMLInputElement>(null);

    // Extract all unique tags from procedures
    const allTags = React.useMemo(() => {
      const tags = new Set<string>();

      const extractTags = (routerNodes: RouterNode[]) => {
        routerNodes.forEach(router => {
          router.procedures.forEach(procedure => {
            procedure.meta?.tags?.forEach(tag => tags.add(tag));
          });
          extractTags(router.children);
        });
      };

      extractTags(routers);
      return Array.from(tags).sort();
    }, [routers]);

    // Filter procedures based on current filters
    const filterProcedure = React.useCallback(
      (procedure: ProcedureNode): boolean => {
        // Filter by visibility (hidden procedures should not be shown at all)
        if (procedure.meta?.visibility === 'hidden') {
          return false;
        }

        // Filter by deprecated toggle
        if (filters.hideDeprecated && procedure.meta?.deprecated) {
          return false;
        }

        // Filter by internal toggle
        if (filters.hideInternal && procedure.meta?.visibility === 'internal') {
          return false;
        }

        // Filter by search query (name) - use debounced value
        if (debouncedSearchQuery) {
          const query = debouncedSearchQuery.toLowerCase();
          if (!procedure.name.toLowerCase().includes(query)) {
            return false;
          }
        }

        // Filter by selected tags
        if (filters.selectedTags.length > 0) {
          const procedureTags = procedure.meta?.tags || [];
          if (!filters.selectedTags.some(tag => procedureTags.includes(tag))) {
            return false;
          }
        }

        return true;
      },
      [filters, debouncedSearchQuery]
    );

    // Filter routers to only show those with visible procedures
    const filteredRouters = React.useMemo(() => {
      const filterRouter = (router: RouterNode): RouterNode | null => {
        const filteredProcedures = router.procedures.filter(filterProcedure);
        const filteredChildren = router.children
          .map(filterRouter)
          .filter((child): child is RouterNode => child !== null);

        if (filteredProcedures.length === 0 && filteredChildren.length === 0) {
          return null;
        }

        return {
          ...router,
          procedures: filteredProcedures,
          children: filteredChildren,
        };
      };

      return routers
        .map(filterRouter)
        .filter((router): router is RouterNode => router !== null);
    }, [routers, filterProcedure]);

    const toggleRouter = (routerName: string) => {
      setExpandedRouters(prev => {
        const next = new Set(prev);
        if (next.has(routerName)) {
          next.delete(routerName);
        } else {
          next.add(routerName);
        }
        return next;
      });
    };

    const toggleTag = (tag: string) => {
      setFilters(prev => ({
        ...prev,
        selectedTags: prev.selectedTags.includes(tag)
          ? prev.selectedTags.filter(t => t !== tag)
          : [...prev.selectedTags, tag],
      }));
    };

    const clearFilters = () => {
      setFilters({
        searchQuery: '',
        selectedTags: [],
        hideDeprecated: false,
        hideInternal: false,
      });
      announceToScreenReader('Filters cleared');
    };

    const hasActiveFilters =
      debouncedSearchQuery ||
      filters.selectedTags.length > 0 ||
      filters.hideDeprecated ||
      filters.hideInternal;

    // Calculate total number of items for virtualization threshold
    const totalItems = React.useMemo(() => {
      let count = 0;
      const countItems = (routerNodes: RouterNode[]) => {
        routerNodes.forEach(router => {
          if (router.children.length > 0 || router.procedures.length > 0) {
            count++; // Router header
          }
          count += router.procedures.length; // Procedures
          countItems(router.children); // Child routers
        });
      };
      countItems(filteredRouters);
      return count;
    }, [filteredRouters]);

    // Use virtualization for large lists (>100 items)
    const shouldVirtualize = totalItems > 100;

    // Keyboard shortcuts
    useStudioShortcuts({
      onFocusSearch: () => {
        searchInputRef.current?.focus();
      },
    });

    return (
      <nav
        className="flex flex-col h-full"
        role="navigation"
        aria-label="tRPC Router Navigation"
      >
        {/* Search and Filters Header */}
        <div className="p-4 border-b border-border space-y-3" role="search">
          {/* Search Input */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              ref={searchInputRef}
              id={searchInputId}
              placeholder="Search procedures... (Press / to focus)"
              value={filters.searchQuery}
              onChange={e => {
                const value = e.target.value;
                setFilters(prev => ({ ...prev, searchQuery: value }));
                if (value) {
                  announceToScreenReader(`Searching for ${value}`, 'polite');
                }
              }}
              className="pl-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Search procedures"
              aria-describedby={`${searchInputId}-help`}
            />
            <div id={`${searchInputId}-help`} className="sr-only">
              Type to search through available procedures. Use arrow keys to
              navigate results.
            </div>
          </div>

          {/* Filter Toggles */}
          <fieldset
            className="flex flex-wrap gap-2"
            aria-labelledby={`${filtersId}-legend`}
          >
            <legend id={`${filtersId}-legend`} className="sr-only">
              Filter options
            </legend>
            <Toggle
              pressed={filters.hideDeprecated}
              onPressedChange={pressed => {
                setFilters(prev => ({ ...prev, hideDeprecated: pressed }));
                announceToScreenReader(
                  pressed
                    ? 'Deprecated procedures hidden'
                    : 'Deprecated procedures shown'
                );
              }}
              size="sm"
              className="text-xs"
            >
              Hide Deprecated
            </Toggle>
            <Toggle
              pressed={filters.hideInternal}
              onPressedChange={pressed => {
                setFilters(prev => ({ ...prev, hideInternal: pressed }));
                announceToScreenReader(
                  pressed
                    ? 'Internal procedures hidden'
                    : 'Internal procedures shown'
                );
              }}
              size="sm"
              className="text-xs"
            >
              Hide Internal
            </Toggle>
          </fieldset>

          {/* Tag Filters */}
          {allTags.length > 0 && (
            <div
              className="space-y-2"
              role="group"
              aria-labelledby={`${filtersId}-tags-label`}
            >
              <div className="flex items-center gap-2">
                <Filter
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <span
                  id={`${filtersId}-tags-label`}
                  className="text-sm font-medium"
                >
                  Filter by tags:
                </span>
              </div>
              <div
                className="flex flex-wrap gap-1"
                role="group"
                aria-label="Tag filters"
              >
                {allTags.map(tag => {
                  const isSelected = filters.selectedTags.includes(tag);
                  return (
                    <Badge
                      key={tag}
                      variant={isSelected ? 'default' : 'outline'}
                      className="cursor-pointer text-xs hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      onClick={() => toggleTag(tag)}
                      tabIndex={0}
                      role="button"
                      aria-pressed={isSelected}
                      aria-label={`${isSelected ? 'Remove' : 'Add'} ${tag} filter`}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleTag(tag);
                        }
                      }}
                    >
                      {tag}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="w-full text-xs"
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Router Tree */}
        <div className="flex-1 flex flex-col">
          {filteredRouters.length === 0 ? (
            <div
              className="flex-1 flex items-center justify-center"
              role="status"
              aria-live="polite"
            >
              <p className="text-muted-foreground text-sm">
                {hasActiveFilters
                  ? 'No procedures match your filters'
                  : 'No procedures found'}
              </p>
            </div>
          ) : shouldVirtualize ? (
            <VirtualizedRouterTree
              routers={filteredRouters}
              expandedRouters={expandedRouters}
              onToggleRouter={toggleRouter}
              onProcedureSelect={onProcedureSelect}
              selectedProcedure={selectedProcedure}
              height={400} // Will be calculated dynamically in real implementation
              className="flex-1"
            />
          ) : (
            <ScrollArea className="flex-1">
              <div className="p-2">
                <div
                  id={treeId}
                  role="tree"
                  aria-label="tRPC Router and Procedures"
                  aria-describedby={`${treeId}-help`}
                >
                  <div id={`${treeId}-help`} className="sr-only">
                    Use arrow keys to navigate, Enter or Space to select, and
                    Left/Right to expand/collapse routers.
                  </div>
                  <RouterTreeNode
                    routers={filteredRouters}
                    expandedRouters={expandedRouters}
                    onToggleRouter={toggleRouter}
                    onProcedureSelect={onProcedureSelect}
                    selectedProcedure={selectedProcedure}
                    level={0}
                    treeId={treeId}
                  />
                </div>
              </div>
            </ScrollArea>
          )}
        </div>
      </nav>
    );
  }
);

RouterTreeNavigation.displayName = 'RouterTreeNavigation';

interface RouterTreeNodeProps {
  routers: RouterNode[];
  expandedRouters: Set<string>;
  onToggleRouter: (routerName: string) => void;
  onProcedureSelect: (router: RouterNode, procedure: ProcedureNode) => void;
  selectedProcedure?: {
    router: RouterNode;
    procedure: ProcedureNode;
  } | null;
  level: number;
  treeId: string;
}

function RouterTreeNode({
  routers,
  expandedRouters,
  onToggleRouter,
  onProcedureSelect,
  selectedProcedure,
  level,
  treeId,
}: RouterTreeNodeProps) {
  // Collect all items (routers and procedures) for keyboard navigation
  const allItems = React.useMemo(() => {
    const items: Array<{
      type: 'router' | 'procedure';
      router: RouterNode;
      procedure?: ProcedureNode;
      id: string;
    }> = [];

    const collectItems = (routerNodes: RouterNode[], currentLevel: number) => {
      routerNodes.forEach(router => {
        const hasChildren =
          router.children.length > 0 || router.procedures.length > 0;

        if (hasChildren) {
          items.push({
            type: 'router',
            router,
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
              id: `procedure-${router.name}-${procedure.name}`,
            });
          });

          // Add child routers
          collectItems(router.children, currentLevel + 1);
        }
      });
    };

    collectItems(routers, level);
    return items;
  }, [routers, expandedRouters, level]);

  // Keyboard navigation
  const { activeIndex, keyDownHandler, getItemProps } = useKeyboardNavigation(
    allItems.length,
    {
      orientation: 'vertical',
      enableArrowKeys: true,
      enableHomeEnd: true,
      onKeyDown: (event, index) => {
        const item = allItems[index];
        if (!item) return;

        switch (event.key) {
          case 'Enter':
          case ' ':
            event.preventDefault();
            if (item.type === 'router') {
              onToggleRouter(item.router.name);
              announceToScreenReader(
                expandedRouters.has(item.router.name)
                  ? `${item.router.name} router collapsed`
                  : `${item.router.name} router expanded`
              );
            } else if (item.procedure) {
              onProcedureSelect(item.router, item.procedure);
              announceToScreenReader(
                `Selected ${item.procedure.name} procedure`
              );
            }
            break;
          case 'ArrowRight':
            if (
              item.type === 'router' &&
              !expandedRouters.has(item.router.name)
            ) {
              event.preventDefault();
              onToggleRouter(item.router.name);
              announceToScreenReader(`${item.router.name} router expanded`);
            }
            break;
          case 'ArrowLeft':
            if (
              item.type === 'router' &&
              expandedRouters.has(item.router.name)
            ) {
              event.preventDefault();
              onToggleRouter(item.router.name);
              announceToScreenReader(`${item.router.name} router collapsed`);
            }
            break;
        }
      },
    }
  );

  return (
    <div className="space-y-1" onKeyDown={keyDownHandler}>
      {routers.map((router, routerIndex) => {
        const isExpanded = expandedRouters.has(router.name);
        const hasChildren =
          router.children.length > 0 || router.procedures.length > 0;

        return (
          <div key={router.name}>
            {/* Router Header */}
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onToggleRouter(router.name);
                  announceToScreenReader(
                    isExpanded
                      ? `${router.name} router collapsed`
                      : `${router.name} router expanded`
                  );
                }}
                className={cn(
                  'w-full justify-start text-left font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  level > 0 && 'ml-4'
                )}
                role="treeitem"
                aria-expanded={isExpanded}
                aria-level={level + 1}
                aria-label={`${router.name} router, ${isExpanded ? 'expanded' : 'collapsed'}`}
                {...getItemProps(
                  allItems.findIndex(
                    item =>
                      item.type === 'router' && item.router.name === router.name
                  )
                )}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 mr-1" aria-hidden="true" />
                ) : (
                  <ChevronRight className="h-4 w-4 mr-1" aria-hidden="true" />
                )}
                {router.name}
              </Button>
            )}

            {/* Router Content */}
            {isExpanded && hasChildren && (
              <div className="ml-4 space-y-1" role="group">
                {/* Procedures */}
                {router.procedures.map(procedure => {
                  const isSelected =
                    selectedProcedure?.router.name === router.name &&
                    selectedProcedure?.procedure.name === procedure.name;

                  const procedureItemIndex = allItems.findIndex(
                    item =>
                      item.type === 'procedure' &&
                      item.router.name === router.name &&
                      item.procedure?.name === procedure.name
                  );

                  return (
                    <Button
                      key={procedure.name}
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onProcedureSelect(router, procedure);
                        announceToScreenReader(
                          `Selected ${procedure.name} ${procedure.type}`
                        );
                      }}
                      className={cn(
                        'w-full justify-start text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        isSelected && 'bg-accent text-accent-foreground'
                      )}
                      role="treeitem"
                      aria-level={level + 2}
                      aria-selected={isSelected}
                      aria-label={`${procedure.name} ${procedure.type}${
                        procedure.meta?.deprecated ? ', deprecated' : ''
                      }${
                        procedure.meta?.visibility === 'internal'
                          ? ', internal'
                          : ''
                      }`}
                      {...getItemProps(procedureItemIndex)}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <Badge
                          variant={
                            procedure.type === 'query' ? 'secondary' : 'default'
                          }
                          className="text-xs"
                          aria-hidden="true"
                        >
                          {procedure.type.toUpperCase()}
                        </Badge>
                        <span className="flex-1 truncate">
                          {procedure.name}
                        </span>
                        <div className="flex gap-1">
                          {procedure.meta?.deprecated && (
                            <Badge
                              variant="destructive"
                              className="text-xs"
                              aria-label="Deprecated"
                            >
                              Deprecated
                            </Badge>
                          )}
                          {procedure.meta?.visibility === 'internal' && (
                            <Badge
                              variant="outline"
                              className="text-xs"
                              aria-label="Internal"
                            >
                              Internal
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Button>
                  );
                })}

                {/* Child Routers */}
                {router.children.length > 0 && (
                  <RouterTreeNode
                    routers={router.children}
                    expandedRouters={expandedRouters}
                    onToggleRouter={onToggleRouter}
                    onProcedureSelect={onProcedureSelect}
                    selectedProcedure={selectedProcedure}
                    level={level + 1}
                    treeId={treeId}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
