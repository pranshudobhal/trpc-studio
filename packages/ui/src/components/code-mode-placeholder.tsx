import * as React from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Code } from 'lucide-react';

export interface CodeModePlaceholderProps {
  className?: string;
}

/**
 * Placeholder component for Code Mode functionality.
 * Monaco editor will be available in v1.1 as a lazy-loaded feature.
 */
export function CodeModePlaceholder({ className }: CodeModePlaceholderProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center ${className}`}
    >
      <div className="mb-4">
        <Code className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Code Mode</h3>
      <p className="text-muted-foreground mb-4 max-w-md">
        Generate client code snippets and explore your API with Monaco editor.
      </p>
      <Badge variant="secondary" className="mb-4">
        Coming in v1.1
      </Badge>
      <p className="text-sm text-muted-foreground">
        This feature will be available in the next version with lazy-loaded
        Monaco editor support.
      </p>
    </div>
  );
}

// Dynamic import stub for future v1.1 implementation
export const CodeMode = React.lazy(() =>
  Promise.resolve({ default: CodeModePlaceholder })
);
