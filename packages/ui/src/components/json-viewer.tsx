import * as React from 'react';
import {
  JsonView,
  allExpanded,
  darkStyles,
  defaultStyles,
} from 'react-json-view-lite';
import { Button } from './ui/button';
import { Copy, Expand, Minimize } from 'lucide-react';
import { cn } from '../lib/utils';

export interface JsonViewerProps {
  data: unknown;
  className?: string;
  maxHeight?: number;
  showCopyButton?: boolean;
  defaultExpanded?: boolean;
}

export function JsonViewer({
  data,
  className,
  maxHeight = 400,
  showCopyButton = true,
  defaultExpanded = false,
}: JsonViewerProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  const [isDark, setIsDark] = React.useState(false);

  // Detect dark mode from CSS variables or system preference
  React.useEffect(() => {
    const checkDarkMode = () => {
      const isDarkMode =
        document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(isDarkMode);
    };

    checkDarkMode();

    // Listen for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkDarkMode);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkDarkMode);
    };
  }, []);

  const copyToClipboard = async () => {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      await navigator.clipboard.writeText(jsonString);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = JSON.stringify(data, null, 2);
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const styles = isDark ? darkStyles : defaultStyles;

  return (
    <div className={cn('relative border border-border rounded-lg', className)}>
      {/* Header with controls */}
      <div className="flex items-center justify-between p-2 border-b border-border bg-muted/50">
        <span className="text-xs font-medium text-muted-foreground">JSON</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-6 w-6 p-0 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            title={expanded ? 'Collapse all' : 'Expand all'}
          >
            {expanded ? (
              <Minimize className="h-3 w-3" />
            ) : (
              <Expand className="h-3 w-3" />
            )}
          </Button>

          {showCopyButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="h-6 w-6 p-0 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              title="Copy JSON"
            >
              <Copy className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* JSON Content */}
      <div
        className="p-3 overflow-auto"
        style={{ maxHeight: `${maxHeight}px` }}
      >
        <JsonView
          data={data as object | any[]}
          shouldExpandNode={expanded ? allExpanded : undefined}
          style={styles}
        />
      </div>
    </div>
  );
}
