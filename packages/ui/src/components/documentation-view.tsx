import * as React from 'react';
import {
  RouterIntrospection,
  RouterNode,
  ProcedureNode,
} from '@trpc-studio/core';
import { RouterTreeNavigation } from './router-tree-navigation';
import { OptimizedProcedureDetails } from './optimized-procedure-details';
import { cn } from '../lib/utils';

export interface DocumentationViewProps {
  introspection: RouterIntrospection;
  trpcEndpoint: string;
  className?: string;
}

export const DocumentationView = React.memo<DocumentationViewProps>(
  ({ introspection, trpcEndpoint, className }) => {
    const [selectedProcedure, setSelectedProcedure] = React.useState<{
      router: RouterNode;
      procedure: ProcedureNode;
    } | null>(null);

    // Memoize the procedure selection handler
    const handleProcedureSelect = React.useCallback(
      (router: RouterNode, procedure: ProcedureNode) => {
        setSelectedProcedure({ router, procedure });
      },
      []
    );

    return (
      <div className={cn('flex h-full', className)}>
        {/* Sidebar - Router Tree Navigation */}
        <div className="w-80 border-r border-border flex flex-col">
          <RouterTreeNavigation
            routers={introspection.routers}
            onProcedureSelect={handleProcedureSelect}
            selectedProcedure={selectedProcedure}
          />
        </div>

        {/* Main Content - Procedure Details */}
        <div className="flex-1 flex flex-col">
          {selectedProcedure ? (
            <OptimizedProcedureDetails
              router={selectedProcedure.router}
              procedure={selectedProcedure.procedure}
              trpcEndpoint={trpcEndpoint}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">
                  Welcome to tRPC Studio
                </h2>
                <p className="text-muted-foreground">
                  Select a procedure from the sidebar to view its documentation
                  and test it.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

DocumentationView.displayName = 'DocumentationView';
