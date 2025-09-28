import * as React from 'react';
import { RouterNode, ProcedureNode, Visibility } from '@trpc-studio/core';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Toggle } from './ui/toggle';
import { ScrollArea } from './ui/scroll-area';
import { Search, ChevronRight, ChevronDown, Filter } from 'lucide-react';
import { cn } from '../lib/utils';

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

export function RouterTreeNavigation({
  routers,
  onProcedureSelect,
  selectedProcedure,
}: RouterTreeNavigationProps) {
  const [filters, setFilters] = React.useState<FilterState>({
    searchQuery: '',
    selectedTags: [],
    hideDeprecated: false,
    hideInternal: false,
  });

  const [expandedRouters, setExpandedRouters] = React.useState<Set<string>>(
    new Set()
  );

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

      // Filter by search query (name)
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
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
    [filters]
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
  };

  const hasActiveFilters =
    filters.searchQuery ||
    filters.selectedTags.length > 0 ||
    filters.hideDeprecated ||
    filters.hideInternal;

  return (
    <div className="flex flex-col h-full">
      {/* Search and Filters Header */}
      <div className="p-4 border-b border-border space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search procedures..."
            value={filters.searchQuery}
            onChange={e =>
              setFilters(prev => ({ ...prev, searchQuery: e.target.value }))
            }
            className="pl-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        {/* Filter Toggles */}
        <div className="flex flex-wrap gap-2">
          <Toggle
            pressed={filters.hideDeprecated}
            onPressedChange={pressed =>
              setFilters(prev => ({ ...prev, hideDeprecated: pressed }))
            }
            size="sm"
            className="text-xs"
          >
            Hide Deprecated
          </Toggle>
          <Toggle
            pressed={filters.hideInternal}
            onPressedChange={pressed =>
              setFilters(prev => ({ ...prev, hideInternal: pressed }))
            }
            size="sm"
            className="text-xs"
          >
            Hide Internal
          </Toggle>
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter by tags:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {allTags.map(tag => (
                <Badge
                  key={tag}
                  variant={
                    filters.selectedTags.includes(tag) ? 'default' : 'outline'
                  }
                  className="cursor-pointer text-xs hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  onClick={() => toggleTag(tag)}
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleTag(tag);
                    }
                  }}
                >
                  {tag}
                </Badge>
              ))}
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
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredRouters.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">
                {hasActiveFilters
                  ? 'No procedures match your filters'
                  : 'No procedures found'}
              </p>
            </div>
          ) : (
            <RouterTreeNode
              routers={filteredRouters}
              expandedRouters={expandedRouters}
              onToggleRouter={toggleRouter}
              onProcedureSelect={onProcedureSelect}
              selectedProcedure={selectedProcedure}
              level={0}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

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
}

function RouterTreeNode({
  routers,
  expandedRouters,
  onToggleRouter,
  onProcedureSelect,
  selectedProcedure,
  level,
}: RouterTreeNodeProps) {
  return (
    <div className="space-y-1">
      {routers.map(router => {
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
                onClick={() => onToggleRouter(router.name)}
                className={cn(
                  'w-full justify-start text-left font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  level > 0 && 'ml-4'
                )}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 mr-1" />
                ) : (
                  <ChevronRight className="h-4 w-4 mr-1" />
                )}
                {router.name}
              </Button>
            )}

            {/* Router Content */}
            {isExpanded && hasChildren && (
              <div className="ml-4 space-y-1">
                {/* Procedures */}
                {router.procedures.map(procedure => {
                  const isSelected =
                    selectedProcedure?.router.name === router.name &&
                    selectedProcedure?.procedure.name === procedure.name;

                  return (
                    <Button
                      key={procedure.name}
                      variant="ghost"
                      size="sm"
                      onClick={() => onProcedureSelect(router, procedure)}
                      className={cn(
                        'w-full justify-start text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        isSelected && 'bg-accent text-accent-foreground'
                      )}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <Badge
                          variant={
                            procedure.type === 'query' ? 'secondary' : 'default'
                          }
                          className="text-xs"
                        >
                          {procedure.type.toUpperCase()}
                        </Badge>
                        <span className="flex-1 truncate">
                          {procedure.name}
                        </span>
                        <div className="flex gap-1">
                          {procedure.meta?.deprecated && (
                            <Badge variant="destructive" className="text-xs">
                              Deprecated
                            </Badge>
                          )}
                          {procedure.meta?.visibility === 'internal' && (
                            <Badge variant="outline" className="text-xs">
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
