import { describe, it, expect } from 'vitest';
import {
  extractBearerToken,
  extractStudioToken,
  extractToken,
  validateToken,
  validateRequestToken,
} from '../token-validation';
import type { RequestContext, StudioOptions } from '../../types/security';

describe('extractBearerToken', () => {
  it('should extract token from valid Bearer header', () => {
    expect(extractBearerToken('Bearer abc123')).toBe('abc123');
    expect(extractBearerToken('bearer xyz789')).toBe('xyz789');
    expect(extractBearerToken('BEARER token-with-dashes')).toBe(
      'token-with-dashes'
    );
  });

  it('should handle array headers', () => {
    expect(extractBearerToken(['Bearer abc123'])).toBe('abc123');
    expect(extractBearerToken(['Bearer abc123', 'Bearer xyz789'])).toBe(
      'abc123'
    );
  });

  it('should return null for invalid headers', () => {
    expect(extractBearerToken(undefined)).toBeNull();
    expect(extractBearerToken('')).toBeNull();
    expect(extractBearerToken('Basic abc123')).toBeNull();
    expect(extractBearerToken('Bearer')).toBeNull();
    expect(extractBearerToken('Bearer ')).toBeNull();
    expect(extractBearerToken([])).toBeNull();
    expect(extractBearerToken([undefined])).toBeNull();
  });
});

describe('extractStudioToken', () => {
  it('should extract token from studio header', () => {
    expect(extractStudioToken('abc123')).toBe('abc123');
    expect(extractStudioToken('token-with-dashes')).toBe('token-with-dashes');
  });

  it('should handle array headers', () => {
    expect(extractStudioToken(['abc123'])).toBe('abc123');
    expect(extractStudioToken(['abc123', 'xyz789'])).toBe('abc123');
  });

  it('should return null for invalid headers', () => {
    expect(extractStudioToken(undefined)).toBeNull();
    expect(extractStudioToken('')).toBeNull();
    expect(extractStudioToken([])).toBeNull();
    expect(extractStudioToken([undefined])).toBeNull();
  });
});

describe('extractToken', () => {
  it('should prioritize custom token extraction', () => {
    const headers = {
      authorization: 'Bearer header-token',
      'x-trpc-studio-token': 'studio-token',
    };
    const getToken = () => 'custom-token';
    const request = {};

    const result = extractToken(headers, getToken, request);
    expect(result.token).toBe('custom-token');
    expect(result.source).toBe('custom');
  });

  it('should fall back to Authorization header when custom extraction fails', () => {
    const headers = {
      authorization: 'Bearer header-token',
      'x-trpc-studio-token': 'studio-token',
    };
    const getToken = () => {
      throw new Error('Custom extraction failed');
    };
    const request = {};

    const result = extractToken(headers, getToken, request);
    expect(result.token).toBe('header-token');
    expect(result.source).toBe('authorization');
  });

  it('should use Authorization Bearer token when available', () => {
    const headers = {
      authorization: 'Bearer auth-token',
      'x-trpc-studio-token': 'studio-token',
    };

    const result = extractToken(headers);
    expect(result.token).toBe('auth-token');
    expect(result.source).toBe('authorization');
  });

  it('should fall back to studio token when Authorization is not available', () => {
    const headers = {
      'x-trpc-studio-token': 'studio-token',
    };

    const result = extractToken(headers);
    expect(result.token).toBe('studio-token');
    expect(result.source).toBe('x-trpc-studio-token');
  });

  it('should return null when no tokens are available', () => {
    const headers = {};

    const result = extractToken(headers);
    expect(result.token).toBeNull();
    expect(result.source).toBe('authorization');
  });

  it('should ignore custom extraction when no request is provided', () => {
    const headers = {
      authorization: 'Bearer header-token',
    };
    const getToken = () => 'custom-token';

    const result = extractToken(headers, getToken);
    expect(result.token).toBe('header-token');
    expect(result.source).toBe('authorization');
  });
});

describe('validateToken', () => {
  it('should validate correct token', () => {
    const result = validateToken('correct-token', 'correct-token');
    expect(result.valid).toBe(true);
    expect(result.token).toBe('correct-token');
    expect(result.error).toBeUndefined();
  });

  it('should reject incorrect token', () => {
    const result = validateToken('wrong-token', 'correct-token');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid token');
  });

  it('should reject missing token', () => {
    const result = validateToken(null, 'correct-token');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('No token provided');
  });

  it('should reject when no expected token is configured', () => {
    const result = validateToken('some-token', undefined);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('No token configured for validation');
  });
});

describe('validateRequestToken', () => {
  const mockContext: RequestContext = {
    headers: {},
    method: 'GET',
    url: '/test',
  };

  it('should validate token from Authorization header', () => {
    const context: RequestContext = {
      ...mockContext,
      headers: { authorization: 'Bearer test-token' },
    };
    const options: StudioOptions = {
      router: {},
      token: 'test-token',
    };

    const result = validateRequestToken(context, options);
    expect(result.valid).toBe(true);
    expect(result.token).toBe('test-token');
  });

  it('should validate token from studio header', () => {
    const context: RequestContext = {
      ...mockContext,
      headers: { 'x-trpc-studio-token': 'test-token' },
    };
    const options: StudioOptions = {
      router: {},
      token: 'test-token',
    };

    const result = validateRequestToken(context, options);
    expect(result.valid).toBe(true);
    expect(result.token).toBe('test-token');
  });

  it('should use custom token extraction', () => {
    const context: RequestContext = {
      ...mockContext,
      headers: {},
    };
    const options: StudioOptions = {
      router: {},
      token: 'test-token',
      getToken: () => 'test-token',
    };
    const request = {};

    const result = validateRequestToken(context, options, request);
    expect(result.valid).toBe(true);
    expect(result.token).toBe('test-token');
  });

  it('should reject invalid token', () => {
    const context: RequestContext = {
      ...mockContext,
      headers: { authorization: 'Bearer wrong-token' },
    };
    const options: StudioOptions = {
      router: {},
      token: 'correct-token',
    };

    const result = validateRequestToken(context, options);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid token');
  });
});
