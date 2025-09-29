import * as React from 'react';
import type { ReactNode } from 'react';
import {
  RequestResult,
  detectSuperJson,
  extractSuperJsonTypes,
} from '../lib/trpc-client';
import { JsonViewer } from './json-viewer';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
  History,
  Eye,
  EyeOff,
  Zap,
} from 'lucide-react';
import { cn } from '../lib/utils';

export interface ResponsePanelProps {
  result?: RequestResult;
  history: RequestResult[];
  onSelectHistoryItem?: (result: RequestResult) => void;
  className?: string;
}

export function ResponsePanel({
  result,
  history,
  onSelectHistoryItem,
  className,
}: ResponsePanelProps) {
  const [showRawResponse, setShowRawResponse] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('response');

  // Reset to response tab when new result comes in
  React.useEffect(() => {
    if (result) {
      setActiveTab('response');
    }
  }, [result]);

  if (!result) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <div className="text-center text-muted-foreground">
          <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Execute a request to see the response</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Response Header */}
      <div className="border-b border-border p-4">
        <ResponseHeader result={result} />
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col"
      >
        <TabsList className="grid w-full grid-cols-3 mx-4 mt-2">
          <TabsTrigger value="response">Response</TabsTrigger>
          <TabsTrigger value="headers">Headers</TabsTrigger>
          <TabsTrigger value="history">History ({history.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="response" className="flex-1 flex flex-col mt-2">
          <ResponseContent
            result={result}
            showRaw={showRawResponse}
            onToggleRaw={() => setShowRawResponse(!showRawResponse)}
          />
        </TabsContent>

        <TabsContent value="headers" className="flex-1 mt-2">
          <HeadersContent result={result} />
        </TabsContent>

        <TabsContent value="history" className="flex-1 mt-2">
          <HistoryContent
            history={history}
            currentResult={result}
            onSelectItem={onSelectHistoryItem}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ResponseHeader({ result }: { result: RequestResult }) {
  const isSuccess = result.status >= 200 && result.status < 300;
  const isError = result.status >= 400;
  const isNetworkError = result.status === 0;

  const statusColor = isNetworkError
    ? 'text-orange-600'
    : isSuccess
      ? 'text-green-600'
      : isError
        ? 'text-red-600'
        : 'text-yellow-600';

  const StatusIcon = isNetworkError
    ? AlertCircle
    : isSuccess
      ? CheckCircle
      : XCircle;

  return (
    <div className="space-y-3">
      {/* Status and Duration */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <StatusIcon className={cn('h-4 w-4', statusColor)} />
          <span className={cn('font-medium', statusColor)}>
            {result.status} {result.statusText}
          </span>
          {/* Error badges */}
          {isNetworkError && (
            <Badge variant="destructive" className="text-xs">
              Network Error
            </Badge>
          )}
          {result.response?.error && (
            <Badge variant="destructive" className="text-xs">
              tRPC Error
            </Badge>
          )}
          {isError && !result.response?.error && !isNetworkError && (
            <Badge variant="destructive" className="text-xs">
              HTTP Error
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>{result.duration}ms</span>
          </div>
          <span>{result.timestamp.toLocaleTimeString()}</span>
        </div>
      </div>

      <div className="flex items-center space-x-2 text-sm">
        <Badge variant="outline" className="text-xs">
          {result.request.method.toUpperCase()}
        </Badge>
        <code className="text-xs bg-muted px-2 py-1 rounded">
          {result.request.params.path}
        </code>
      </div>

      {result.response?.result?.data &&
      detectSuperJson(result.response.result.data) ? (
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="text-xs">
            <Zap className="h-3 w-3 mr-1" />
            SuperJSON Detected
          </Badge>
        </div>
      ) : null}
    </div>
  );
}

function ResponseContent({
  result,
  showRaw,
  onToggleRaw,
}: {
  result: RequestResult;
  showRaw: boolean;
  onToggleRaw: () => void;
}) {
  const hasResponse = result.response || result.rawResponse;
  const responseData = result.response?.result?.data;
  const errorData = result.response?.error || result.error;

  return (
    <div className="flex-1 flex flex-col">
      {/* Controls */}
      <div className="flex items-center justify-between px-4 pb-2">
        <h3 className="text-sm font-medium">Response Body</h3>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleRaw}
            className="h-7 text-xs"
            aria-label={
              showRaw ? 'Switch to pretty JSON view' : 'Switch to raw JSON view'
            }
          >
            {showRaw ? (
              <>
                <Eye className="h-3 w-3 mr-1" />
                Pretty
              </>
            ) : (
              <>
                <EyeOff className="h-3 w-3 mr-1" />
                Raw
              </>
            )}
          </Button>
          {hasResponse && (
            <CopyButton
              data={showRaw ? result.rawResponse : responseData || errorData}
            />
          )}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 px-4">
        {!hasResponse ? (
          <div className="text-center text-muted-foreground py-8">
            <p>No response data</p>
          </div>
        ) : showRaw ? (
          <RawResponseView data={result.rawResponse || ''} />
        ) : errorData ? (
          <ErrorResponseView error={errorData} />
        ) : responseData ? (
          <SuccessResponseView data={responseData} />
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <p>Empty response</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function SuccessResponseView({ data }: { data: unknown }) {
  const superJsonTypes = React.useMemo(() => {
    return detectSuperJson(data) ? extractSuperJsonTypes(data) : [];
  }, [data]);

  return (
    <div className="space-y-4">
      {/* SuperJSON Type Labels */}
      {superJsonTypes.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">
            SuperJSON Types
          </h4>
          <div className="flex flex-wrap gap-1">
            {superJsonTypes.map((type, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                <span className="font-mono">{type.path}</span>
                <span className="mx-1">:</span>
                <span className="font-semibold">{type.type}</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* JSON Viewer */}
      <JsonViewer data={data} defaultExpanded={true} showCopyButton={false} />
    </div>
  );
}

function ErrorResponseView({ error }: { error: any }) {
  const isString = typeof error === 'string';
  const isTrpcError = error && typeof error === 'object' && 'code' in error;

  return (
    <div className="space-y-4">
      {isTrpcError && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Badge variant="destructive">tRPC Error</Badge>
            <Badge variant="outline">{error.code}</Badge>
          </div>

          {error.message && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm font-medium text-destructive">
                {error.message}
              </p>
            </div>
          )}

          {error.data && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground">
                Error Details
              </h4>
              <JsonViewer
                data={error.data}
                defaultExpanded={true}
                showCopyButton={false}
              />
            </div>
          )}
        </div>
      )}

      {isString && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      )}

      {!isString && !isTrpcError && (
        <JsonViewer
          data={error}
          defaultExpanded={true}
          showCopyButton={false}
        />
      )}
    </div>
  );
}

function RawResponseView({ data }: { data: string }) {
  return (
    <div className="space-y-2">
      <pre className="text-xs font-mono bg-muted p-3 rounded-md overflow-auto whitespace-pre-wrap">
        {data}
      </pre>
    </div>
  );
}

function HeadersContent({ result }: { result: RequestResult }) {
  const headers = Object.entries(result.headers);

  return (
    <ScrollArea className="flex-1 px-4">
      {headers.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          <p>No headers</p>
        </div>
      ) : (
        <div className="space-y-2">
          {headers.map(([key, value]) => (
            <div
              key={key}
              className="flex items-start space-x-2 py-2 border-b border-border last:border-0"
            >
              <code className="text-xs font-medium text-muted-foreground min-w-0 flex-shrink-0">
                {key}:
              </code>
              <code className="text-xs break-all">{value}</code>
            </div>
          ))}
        </div>
      )}
    </ScrollArea>
  );
}

function HistoryContent({
  history,
  currentResult,
  onSelectItem,
}: {
  history: RequestResult[];
  currentResult: RequestResult;
  onSelectItem?: (result: RequestResult) => void;
}) {
  if (history.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No request history</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 px-4">
      <div className="space-y-2">
        {history
          .slice()
          .reverse()
          .map(item => (
            <HistoryItem
              key={item.id}
              result={item}
              isActive={item.id === currentResult.id}
              onClick={() => onSelectItem?.(item)}
            />
          ))}
      </div>
    </ScrollArea>
  );
}

function HistoryItem({
  result,
  isActive,
  onClick,
}: {
  result: RequestResult;
  isActive: boolean;
  onClick: () => void;
}) {
  const isSuccess = result.status >= 200 && result.status < 300;
  const isError = result.status >= 400;
  const isNetworkError = result.status === 0;

  const statusColor = isNetworkError
    ? 'text-orange-600'
    : isSuccess
      ? 'text-green-600'
      : isError
        ? 'text-red-600'
        : 'text-yellow-600';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-md border transition-colors',
        'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isActive ? 'border-primary bg-accent' : 'border-border'
      )}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {result.request.method.toUpperCase()}
            </Badge>
            <code className="text-xs font-mono">
              {result.request.params.path}
            </code>
          </div>
          <span className={cn('text-xs font-medium', statusColor)}>
            {result.status}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{result.timestamp.toLocaleTimeString()}</span>
          <span>{result.duration}ms</span>
        </div>
      </div>
    </button>
  );
}

function CopyButton({ data }: { data: unknown }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      const text =
        typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-7 text-xs"
      disabled={copied}
    >
      <Copy className="h-3 w-3 mr-1" />
      {copied ? 'Copied!' : 'Copy'}
    </Button>
  );
}
