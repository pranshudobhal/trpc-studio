/**
 * tRPC HTTP client utilities for making requests to tRPC endpoints
 */

export interface TrpcRequestOptions {
  baseUrl: string;
  endpoint: string;
  headers?: Record<string, string>;
  withCredentials?: boolean;
}

export interface TrpcRequest {
  id: string;
  jsonrpc?: '2.0';
  method: 'query' | 'mutation';
  params: {
    path: string;
    input?: unknown;
  };
}

export interface TrpcResponse {
  id: string;
  jsonrpc?: '2.0';
  result?: {
    data?: unknown;
  };
  error?: {
    code: number;
    message: string;
    data?: {
      code: string;
      httpStatus: number;
      stack?: string;
      path: string;
    };
  };
}

export interface RequestResult {
  id: string;
  request: TrpcRequest;
  response?: TrpcResponse;
  status: number;
  statusText: string;
  duration: number;
  headers: Record<string, string>;
  timestamp: Date;
  error?: string;
  rawResponse?: string;
}

/**
 * Build a tRPC HTTP request for a single procedure call
 */
export function buildTrpcRequest(
  procedurePath: string,
  procedureType: 'query' | 'mutation',
  input?: unknown
): TrpcRequest {
  return {
    id: generateRequestId(),
    jsonrpc: '2.0',
    method: procedureType,
    params: {
      path: procedurePath,
      input,
    },
  };
}

/**
 * Build a tRPC HTTP batch request for multiple procedure calls
 */
export function buildTrpcBatchRequest(
  requests: Array<{
    path: string;
    type: 'query' | 'mutation';
    input?: unknown;
  }>
): TrpcRequest[] {
  return requests.map(req => buildTrpcRequest(req.path, req.type, req.input));
}

/**
 * Execute a single tRPC request
 */
export async function executeTrpcRequest(
  request: TrpcRequest,
  options: TrpcRequestOptions
): Promise<RequestResult> {
  const startTime = Date.now();
  const timestamp = new Date();

  try {
    const url = `${options.baseUrl}${options.endpoint}/${request.params.path}`;
    const isQuery = request.method === 'query';

    let fetchUrl = url;
    let fetchOptions: RequestInit = {
      method: isQuery ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: options.withCredentials ? 'include' : 'same-origin',
    };

    // For queries, add input as URL search params
    if (isQuery && request.params.input !== undefined) {
      const searchParams = new URLSearchParams();
      searchParams.set('input', JSON.stringify(request.params.input));
      fetchUrl += `?${searchParams.toString()}`;
    }

    // For mutations, add input to request body
    if (!isQuery) {
      fetchOptions.body = JSON.stringify(request.params.input);
    }

    const response = await fetch(fetchUrl, fetchOptions);
    const duration = Date.now() - startTime;

    // Extract response headers
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const rawResponse = await response.text();
    let parsedResponse: TrpcResponse | undefined;

    try {
      parsedResponse = JSON.parse(rawResponse);
    } catch (parseError) {
      // Response is not valid JSON
    }

    return {
      id: request.id,
      request,
      response: parsedResponse,
      status: response.status,
      statusText: response.statusText,
      duration,
      headers,
      timestamp,
      rawResponse,
      error: !response.ok && !parsedResponse ? rawResponse : undefined,
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    return {
      id: request.id,
      request,
      status: 0,
      statusText: 'Network Error',
      duration,
      headers: {},
      timestamp,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute a batch tRPC request
 */
export async function executeTrpcBatchRequest(
  requests: TrpcRequest[],
  options: TrpcRequestOptions
): Promise<RequestResult[]> {
  const startTime = Date.now();
  const timestamp = new Date();

  try {
    const url = `${options.baseUrl}${options.endpoint}`;

    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: options.withCredentials ? 'include' : 'same-origin',
      body: JSON.stringify(requests),
    };

    const response = await fetch(url, fetchOptions);
    const duration = Date.now() - startTime;

    // Extract response headers
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const rawResponse = await response.text();
    let parsedResponses: TrpcResponse[] = [];

    try {
      const parsed = JSON.parse(rawResponse);
      parsedResponses = Array.isArray(parsed) ? parsed : [parsed];
    } catch (parseError) {
      // Response is not valid JSON
    }

    // Map responses back to requests
    return requests.map((request, index) => {
      const matchingResponse = parsedResponses.find(r => r.id === request.id);

      return {
        id: request.id,
        request,
        response: matchingResponse,
        status: response.status,
        statusText: response.statusText,
        duration,
        headers,
        timestamp,
        rawResponse,
        error: !response.ok && !matchingResponse ? rawResponse : undefined,
      };
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    // Return error result for all requests
    return requests.map(request => ({
      id: request.id,
      request,
      status: 0,
      statusText: 'Network Error',
      duration,
      headers: {},
      timestamp,
      error: error instanceof Error ? error.message : 'Unknown error',
    }));
  }
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Detect if a response contains SuperJSON-serialized data
 */
export function detectSuperJson(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  // Check for SuperJSON metadata structure
  if ('json' in data && 'meta' in data) {
    return true;
  }

  // Check for common SuperJSON type markers
  const jsonStr = JSON.stringify(data);
  return (
    jsonStr.includes('"$type":"Date"') ||
    jsonStr.includes('"$type":"BigInt"') ||
    jsonStr.includes('"$type":"Map"') ||
    jsonStr.includes('"$type":"Set"') ||
    jsonStr.includes('"$type":"RegExp"') ||
    jsonStr.includes('"$type":"undefined"')
  );
}

/**
 * Extract SuperJSON type information from data
 */
export function extractSuperJsonTypes(data: unknown): Array<{
  path: string;
  type: string;
  value: unknown;
}> {
  const types: Array<{ path: string; type: string; value: unknown }> = [];

  function traverse(obj: any, path: string = '') {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        traverse(item, `${path}[${index}]`);
      });
      return;
    }

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      // Check for SuperJSON type markers
      if (typeof value === 'object' && value !== null && '$type' in value) {
        types.push({
          path: currentPath,
          type: (value as any).$type,
          value: (value as any).value,
        });
      } else {
        traverse(value, currentPath);
      }
    }
  }

  traverse(data);
  return types;
}
