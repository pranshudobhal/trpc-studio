import * as React from 'react';
import { RouterNode, ProcedureNode } from '@trpc-studio/core';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { SchemaDisplay } from './schema-display';
import { MetadataDisplay } from './metadata-display';
import { cn } from '../lib/utils';

export interface ProcedureDetailsProps {
  router: RouterNode;
  procedure: ProcedureNode;
  trpcEndpoint: string;
  className?: string;
}

export function ProcedureDetails({
  router,
  procedure,
  trpcEndpoint,
  className,
}: ProcedureDetailsProps) {
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="border-b border-border p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Badge
                variant={procedure.type === 'query' ? 'secondary' : 'default'}
                className="text-sm"
              >
                {procedure.type.toUpperCase()}
              </Badge>
              <h1 className="text-2xl font-bold">{procedure.name}</h1>
              <div className="flex gap-2">
                {procedure.meta?.deprecated && (
                  <Badge variant="destructive">Deprecated</Badge>
                )}
                {procedure.meta?.visibility === 'internal' && (
                  <Badge variant="outline">Internal</Badge>
                )}
                {procedure.meta?.authRequired && (
                  <Badge variant="outline">Auth Required</Badge>
                )}
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              <span className="font-medium">{router.name}</span>
              {procedure.meta?.summary && (
                <>
                  <span className="mx-2">•</span>
                  <span>{procedure.meta.summary}</span>
                </>
              )}
            </div>

            {procedure.meta?.description && (
              <p className="text-muted-foreground max-w-2xl">
                {procedure.meta.description}
              </p>
            )}

            {procedure.meta?.tags && procedure.meta.tags.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {procedure.meta.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="documentation" className="h-full flex flex-col">
          <TabsList className="mx-6 mt-4 w-fit">
            <TabsTrigger value="documentation">Documentation</TabsTrigger>
            <TabsTrigger value="playground">Playground</TabsTrigger>
          </TabsList>

          <TabsContent
            value="documentation"
            className="flex-1 overflow-hidden mt-4"
          >
            <ScrollArea className="h-full">
              <div className="px-6 pb-6 space-y-6">
                {/* Input Schema */}
                {procedure.input && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Input Schema</h3>
                    <SchemaDisplay schema={procedure.input} />
                  </div>
                )}

                {/* Output Schema */}
                {procedure.output && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">
                      Output Schema
                    </h3>
                    <SchemaDisplay schema={procedure.output} />
                  </div>
                )}

                {/* Metadata */}
                {procedure.meta && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">
                      Additional Information
                    </h3>
                    <MetadataDisplay meta={procedure.meta} />
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent
            value="playground"
            className="flex-1 overflow-hidden mt-4"
          >
            <div className="px-6 pb-6 h-full">
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">
                    Playground Coming Soon
                  </h3>
                  <p className="text-muted-foreground">
                    Interactive testing will be available in the next task
                    implementation.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
