import * as React from 'react';
import { RouterNode, ProcedureNode } from '@trpc-studio/core';
import { ProcedureDetails } from './procedure-details';

export interface OptimizedProcedureDetailsProps {
  router: RouterNode;
  procedure: ProcedureNode;
  trpcEndpoint: string;
}

/**
 * Memoized version of ProcedureDetails to prevent unnecessary re-renders
 * when parent components update but procedure data hasn't changed.
 */
export const OptimizedProcedureDetails =
  React.memo<OptimizedProcedureDetailsProps>(
    ({ router, procedure, trpcEndpoint }) => {
      return (
        <ProcedureDetails
          router={router}
          procedure={procedure}
          trpcEndpoint={trpcEndpoint}
        />
      );
    },
    (prevProps, nextProps) => {
      // Custom comparison function for better memoization
      return (
        prevProps.router.name === nextProps.router.name &&
        prevProps.procedure.name === nextProps.procedure.name &&
        prevProps.procedure.type === nextProps.procedure.type &&
        prevProps.trpcEndpoint === nextProps.trpcEndpoint &&
        // Deep compare meta if it exists
        JSON.stringify(prevProps.procedure.meta) ===
          JSON.stringify(nextProps.procedure.meta) &&
        // Deep compare schemas if they exist
        JSON.stringify(prevProps.procedure.input) ===
          JSON.stringify(nextProps.procedure.input) &&
        JSON.stringify(prevProps.procedure.output) ===
          JSON.stringify(nextProps.procedure.output)
      );
    }
  );

OptimizedProcedureDetails.displayName = 'OptimizedProcedureDetails';
