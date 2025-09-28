import * as React from 'react';
import { ProcedureNode } from '@trpc-studio/core';
import { PlaygroundForm } from './playground-form';
import { ResponsePanel } from './response-panel';
import { EnvironmentSelector } from './environment-selector';
import {
  RequestResult,
  executeTrpcRequest,
  buildTrpcRequest,
  TrpcRequestOptions,
} from '../lib/trpc-client';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Play, Settings } from 'lucide-react';
import { cn } from '../lib/utils';

export interface PlaygroundProps {
  procedure: ProcedureNode;
  trpcEndpoint: string;
  className?: string;
}

export interface PlaygroundEnvironment {
  id: string;
  name: string;
  baseUrl: string;
  headers: Record<string, string>;
  withCredentials: boolean;
}

export function Playground({
  procedure,
  trpcEndpoint,
  className,
}: PlaygroundProps) {
  const [currentResult, setCurrentResult] = React.useState<RequestResult>();
  const [history, setHistory] = React.useState<RequestResult[]>([]);
  const [isExecuting, setIsExecuting] = React.useState(false);
  const [selectedEnvironment, setSelectedEnvironment] =
    React.useState<PlaygroundEnvironment>();

  // Load environments and history from localStorage
  React.useEffect(() => {
    const savedEnvironments = localStorage.getItem('trpc-studio-environments');
    const savedHistory = localStorage.getItem('trpc-studio-history');

    if (savedEnvironments) {
      try {
        const environments: PlaygroundEnvironment[] =
          JSON.parse(savedEnvironments);
        if (environments.length > 0) {
          setSelectedEnvironment(environments[0]);
        }
      } catch (error) {
        console.error('Failed to load environments:', error);
      }
    }

    if (savedHistory) {
      try {
        const parsedHistory: RequestResult[] = JSON.parse(savedHistory);
        // Convert timestamp strings back to Date objects
        const restoredHistory = parsedHistory.map(item => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
        setHistory(restoredHistory);
      } catch (error) {
        console.error('Failed to load history:', error);
      }
    }
  }, []);

  // Save history to localStorage when it changes
  React.useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('trpc-studio-history', JSON.stringify(history));
    }
  }, [history]);

  const handleExecuteRequest = async (input: unknown) => {
    if (!selectedEnvironment) {
      console.error('No environment selected');
      return;
    }

    setIsExecuting(true);

    try {
      const request = buildTrpcRequest(procedure.name, procedure.type, input);

      const options: TrpcRequestOptions = {
        baseUrl: selectedEnvironment.baseUrl,
        endpoint: trpcEndpoint,
        headers: selectedEnvironment.headers,
        withCredentials: selectedEnvironment.withCredentials,
      };

      const result = await executeTrpcRequest(request, options);

      setCurrentResult(result);
      setHistory(prev => {
        const newHistory = [...prev, result];
        // Keep only the last 50 requests
        return newHistory.slice(-50);
      });
    } catch (error) {
      console.error('Request execution failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSelectHistoryItem = (result: RequestResult) => {
    setCurrentResult(result);
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="border-b border-border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-semibold">{procedure.name}</h2>
              <Badge
                variant={procedure.type === 'query' ? 'default' : 'secondary'}
              >
                {procedure.type}
              </Badge>
              {procedure.meta?.deprecated && (
                <Badge variant="destructive">Deprecated</Badge>
              )}
            </div>
            {procedure.meta?.summary && (
              <p className="text-sm text-muted-foreground">
                {procedure.meta.summary}
              </p>
            )}
          </div>

          <EnvironmentSelector
            selectedEnvironment={selectedEnvironment}
            onEnvironmentChange={setSelectedEnvironment}
          />
        </div>

        {procedure.meta?.description && (
          <div className="text-sm text-muted-foreground">
            {procedure.meta.description}
          </div>
        )}

        {procedure.meta?.tags && procedure.meta.tags.length > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">Tags:</span>
            <div className="flex flex-wrap gap-1">
              {procedure.meta.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Form */}
        <div className="w-1/2 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-medium">Request</h3>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {procedure.input ? (
              <PlaygroundForm
                schema={procedure.input}
                onSubmit={handleExecuteRequest}
                defaultValues={procedure.meta?.examples?.[0]?.input}
                isExecuting={isExecuting}
              />
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  This procedure doesn't accept any input parameters.
                </p>
                <Button
                  onClick={() => handleExecuteRequest(undefined)}
                  disabled={isExecuting || !selectedEnvironment}
                  className="w-full"
                >
                  {isExecuting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Execute Request
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Response */}
        <div className="w-1/2 flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-medium">Response</h3>
          </div>

          <div className="flex-1 overflow-hidden">
            <ResponsePanel
              result={currentResult}
              history={history}
              onSelectHistoryItem={handleSelectHistoryItem}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
