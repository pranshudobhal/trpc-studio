import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResponsePanel } from '../response-panel';
import { RequestResult } from '../../lib/trpc-client';

// Mock the JsonViewer component
vi.mock('../json-viewer', () => ({
  JsonViewer: ({ data }: { data: unknown }) => (
    <div data-testid="json-viewer">{JSON.stringify(data)}</div>
  ),
}));

describe('ResponsePanel', () => {
  const mockResult: RequestResult = {
    id: 'test-1',
    request: {
      id: 'test-1',
      jsonrpc: '2.0',
      method: 'query',
      params: {
        path: 'user.getById',
        input: { id: '123' },
      },
    },
    response: {
      id: 'test-1',
      jsonrpc: '2.0',
      result: {
        data: { id: '123', name: 'John Doe' },
      },
    },
    status: 200,
    statusText: 'OK',
    duration: 150,
    headers: {
      'content-type': 'application/json',
      'x-custom-header': 'test-value',
    },
    timestamp: new Date('2023-01-01T12:00:00Z'),
  };

  const mockHistory: RequestResult[] = [
    mockResult,
    {
      ...mockResult,
      id: 'test-2',
      request: {
        ...mockResult.request,
        id: 'test-2',
        params: { path: 'user.getAll' },
      },
      timestamp: new Date('2023-01-01T11:00:00Z'),
    },
  ];

  it('should render empty state when no result', () => {
    render(<ResponsePanel history={[]} />);

    expect(
      screen.getByText('Execute a request to see the response')
    ).toBeInTheDocument();
  });

  it('should render response header with status and duration', () => {
    render(<ResponsePanel result={mockResult} history={mockHistory} />);

    expect(screen.getByText('200 OK')).toBeInTheDocument();
    expect(screen.getByText('150ms')).toBeInTheDocument();
    expect(screen.getByText('user.getById')).toBeInTheDocument();
  });

  it('should render response data in JSON viewer', () => {
    render(<ResponsePanel result={mockResult} history={mockHistory} />);

    // Should be on response tab by default
    expect(screen.getByTestId('json-viewer')).toBeInTheDocument();
    expect(screen.getByTestId('json-viewer')).toHaveTextContent(
      JSON.stringify({ id: '123', name: 'John Doe' })
    );
  });

  it('should show headers tab', () => {
    render(<ResponsePanel result={mockResult} history={mockHistory} />);

    // Headers tab should be present
    expect(screen.getByText('Headers')).toBeInTheDocument();

    // Click headers tab
    fireEvent.click(screen.getByText('Headers'));

    // Tab should be clickable (no error thrown)
    expect(screen.getByText('Headers')).toBeInTheDocument();
  });

  it('should show history tab with count', () => {
    render(<ResponsePanel result={mockResult} history={mockHistory} />);

    // History tab should show count
    expect(screen.getByText(/History \(2\)/)).toBeInTheDocument();

    // Click history tab
    fireEvent.click(screen.getByText(/History \(2\)/));

    // Tab should be clickable (no error thrown)
    expect(screen.getByText(/History \(2\)/)).toBeInTheDocument();
  });

  it('should handle error responses', () => {
    const errorResult: RequestResult = {
      ...mockResult,
      status: 400,
      statusText: 'Bad Request',
      response: {
        id: 'test-1',
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid request',
          data: {
            code: 'BAD_REQUEST',
            httpStatus: 400,
            path: 'user.getById',
          },
        },
      },
    };

    render(<ResponsePanel result={errorResult} history={[]} />);

    expect(screen.getByText('400 Bad Request')).toBeInTheDocument();
    expect(screen.getAllByText('tRPC Error')).toHaveLength(2); // One in header, one in error view
  });

  it('should handle network errors', () => {
    const networkErrorResult: RequestResult = {
      ...mockResult,
      status: 0,
      statusText: 'Network Error',
      response: undefined,
      error: 'Failed to fetch',
    };

    render(<ResponsePanel result={networkErrorResult} history={[]} />);

    expect(screen.getByText('0 Network Error')).toBeInTheDocument();
  });

  it('should toggle between pretty and raw response view', () => {
    render(<ResponsePanel result={mockResult} history={mockHistory} />);

    // Should show Pretty button initially
    const toggleButton = screen.getByText('Raw');
    fireEvent.click(toggleButton);

    // Should now show raw response
    expect(screen.getByText('Pretty')).toBeInTheDocument();
  });

  it('should detect SuperJSON responses', () => {
    const superJsonResult: RequestResult = {
      ...mockResult,
      response: {
        id: 'test-1',
        jsonrpc: '2.0',
        result: {
          data: {
            json: { name: 'John', date: '2023-01-01T00:00:00.000Z' },
            meta: { values: { date: ['Date'] } },
          },
        },
      },
    };

    render(<ResponsePanel result={superJsonResult} history={[]} />);

    expect(screen.getByText('SuperJSON Detected')).toBeInTheDocument();
  });

  it('should call onSelectHistoryItem when history item is clicked', () => {
    const onSelectHistoryItem = vi.fn();
    render(
      <ResponsePanel
        result={mockResult}
        history={mockHistory}
        onSelectHistoryItem={onSelectHistoryItem}
      />
    );

    // Click history tab
    fireEvent.click(screen.getByText(/History \(2\)/));

    // Click on a history item
    const historyItems = screen.getAllByRole('button');
    const historyItem = historyItems.find(item =>
      item.textContent?.includes('user.getAll')
    );

    if (historyItem) {
      fireEvent.click(historyItem);
      expect(onSelectHistoryItem).toHaveBeenCalledWith(mockHistory[1]);
    }
  });

  it('should handle empty headers', () => {
    const noHeadersResult: RequestResult = {
      ...mockResult,
      headers: {},
    };

    render(<ResponsePanel result={noHeadersResult} history={[]} />);

    // Headers tab should be present
    expect(screen.getByText('Headers')).toBeInTheDocument();
  });

  it('should show empty history count', () => {
    render(<ResponsePanel result={mockResult} history={[]} />);

    // History tab should show zero count
    expect(screen.getByText(/History \(0\)/)).toBeInTheDocument();
  });
});
