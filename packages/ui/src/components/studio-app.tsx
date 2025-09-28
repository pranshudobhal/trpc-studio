import * as React from 'react';
import { RouterIntrospection } from '@trpc-studio/core';
import { DocumentationView } from './documentation-view';
import { cn } from '../lib/utils';

export interface StudioAppProps {
  /**
   * URL to fetch router introspection data
   */
  introspectionUrl: string;

  /**
   * Base URL for tRPC endpoint (e.g., '/api/trpc')
   */
  trpcEndpoint: string;

  /**
   * Optional authentication token for studio access
   */
  token?: string;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export function StudioApp({
  introspectionUrl,
  trpcEndpoint,
  token,
  className,
}: StudioAppProps) {
  const [introspection, setIntrospection] =
    React.useState<RouterIntrospection | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchIntrospection = async () => {
      try {
        setLoading(true);
        setError(null);

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (token) {
          headers['x-trpc-studio-token'] = token;
        }

        const response = await fetch(introspectionUrl, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch introspection: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        setIntrospection(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load router introspection'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchIntrospection();
  }, [introspectionUrl, token]);

  if (loading) {
    return (
      <div
        className={cn('flex h-screen items-center justify-center', className)}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading tRPC Studio...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn('flex h-screen items-center justify-center', className)}
      >
        <div className="text-center max-w-md">
          <div className="text-destructive text-lg font-semibold mb-2">
            Failed to Load
          </div>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!introspection) {
    return (
      <div
        className={cn('flex h-screen items-center justify-center', className)}
      >
        <div className="text-center">
          <p className="text-muted-foreground">No router data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('h-screen flex flex-col bg-background', className)}>
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">tRPC Studio</h1>
            <p className="text-sm text-muted-foreground">
              Generated{' '}
              {new Date(introspection.meta.generatedAt).toLocaleString()}
              {introspection.meta.trpcVersion &&
                ` • tRPC v${introspection.meta.trpcVersion}`}
              {introspection.meta.transformer &&
                ` • ${introspection.meta.transformer}`}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <DocumentationView
          introspection={introspection}
          trpcEndpoint={trpcEndpoint}
          className="flex-1"
        />
      </div>
    </div>
  );
}
