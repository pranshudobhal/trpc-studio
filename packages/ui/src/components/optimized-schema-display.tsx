import * as React from 'react';
import { JSONSchema } from '@trpc-studio/core';
import { SchemaDisplay } from './schema-display';

export interface OptimizedSchemaDisplayProps {
  schema?: JSONSchema;
  title: string;
  className?: string;
}

/**
 * Memoized schema display component that only re-renders when the schema changes.
 * Uses deep comparison for schema objects to prevent unnecessary renders.
 */
export const OptimizedSchemaDisplay = React.memo<OptimizedSchemaDisplayProps>(
  ({ schema, title, className }) => {
    if (!schema) {
      return (
        <div className={className}>
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-muted-foreground">No schema available</p>
        </div>
      );
    }

    return (
      <div className={className}>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <SchemaDisplay schema={schema} />
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.title === nextProps.title &&
      prevProps.className === nextProps.className &&
      JSON.stringify(prevProps.schema) === JSON.stringify(nextProps.schema)
    );
  }
);

OptimizedSchemaDisplay.displayName = 'OptimizedSchemaDisplay';
