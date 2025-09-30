import * as React from 'react';
import { ProcedureMeta } from '@trpc-studio/core';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { JsonViewer } from './json-viewer';
import { Copy } from 'lucide-react';
import { cn } from '../lib/utils';

export interface MetadataDisplayProps {
  meta: ProcedureMeta;
  className?: string;
}

export function MetadataDisplay({ meta, className }: MetadataDisplayProps) {
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const hasExamples = meta.examples && meta.examples.length > 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Status Badges */}
      <div className="flex flex-wrap gap-2">
        {meta.deprecated && <Badge variant="destructive">Deprecated</Badge>}
        {meta.visibility === 'internal' && (
          <Badge variant="outline">Internal</Badge>
        )}
        {meta.authRequired && (
          <Badge variant="outline">Authentication Required</Badge>
        )}
      </div>

      {/* Tags */}
      {meta.tags && meta.tags.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Tags</h4>
          <div className="flex flex-wrap gap-1">
            {meta.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Examples */}
      {hasExamples && (
        <div>
          <h4 className="text-sm font-medium mb-2">Examples</h4>
          <div className="space-y-3">
            {meta.examples!.map((example, i) => (
              <div key={i} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-medium">Example {i + 1}</h5>
                </div>

                {example.input !== undefined && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        Input
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(
                            JSON.stringify(example.input, null, 2)
                          )
                        }
                        className="h-6 w-6 p-0 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        title="Copy input"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <JsonViewer
                      data={example.input}
                      maxHeight={200}
                      showCopyButton={false}
                    />
                  </div>
                )}

                {example.output !== undefined && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        Output
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(
                            JSON.stringify(example.output, null, 2)
                          )
                        }
                        className="h-6 w-6 p-0 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        title="Copy output"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <JsonViewer
                      data={example.output}
                      maxHeight={200}
                      showCopyButton={false}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
