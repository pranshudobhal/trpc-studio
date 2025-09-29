import type { Environment } from '../components/environment-selector';

const STORAGE_KEY = 'trpc-studio-environments';

export const DEFAULT_ENVIRONMENTS: Environment[] = [
  {
    id: 'local',
    name: 'Local',
    baseUrl: 'http://localhost:3000',
    headers: {},
    withCredentials: false,
  },
  {
    id: 'dev',
    name: 'Development',
    baseUrl: 'https://dev-api.example.com',
    headers: {},
    withCredentials: false,
  },
  {
    id: 'staging',
    name: 'Staging',
    baseUrl: 'https://staging-api.example.com',
    headers: {},
    withCredentials: false,
  },
  {
    id: 'prod',
    name: 'Production',
    baseUrl: 'https://api.example.com',
    headers: {},
    withCredentials: false,
  },
];

/**
 * Environment manager utility for handling CRUD operations and persistence
 */
export class EnvironmentManager {
  /**
   * Load environments from localStorage
   */
  static loadEnvironments(): Environment[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Failed to load environments from localStorage:', error);
    }

    return DEFAULT_ENVIRONMENTS;
  }

  /**
   * Save environments to localStorage
   */
  static saveEnvironments(environments: Environment[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(environments));
    } catch (error) {
      console.error('Failed to save environments to localStorage:', error);
    }
  }

  /**
   * Create a new environment
   */
  static createEnvironment(
    environments: Environment[],
    environment: Omit<Environment, 'id'>
  ): Environment[] {
    const newEnvironment: Environment = {
      ...environment,
      id: `env_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    const updated = [...environments, newEnvironment];
    this.saveEnvironments(updated);
    return updated;
  }

  /**
   * Update an existing environment
   */
  static updateEnvironment(
    environments: Environment[],
    environmentId: string,
    updates: Partial<Omit<Environment, 'id'>>
  ): Environment[] {
    const updated = environments.map(env =>
      env.id === environmentId ? { ...env, ...updates } : env
    );

    this.saveEnvironments(updated);
    return updated;
  }

  /**
   * Delete an environment
   */
  static deleteEnvironment(
    environments: Environment[],
    environmentId: string
  ): Environment[] {
    const updated = environments.filter(env => env.id !== environmentId);
    this.saveEnvironments(updated);
    return updated;
  }

  /**
   * Generate cURL command for an environment and request
   */
  static generateCurlCommand(
    environment: Environment,
    options: {
      endpoint?: string;
      method?: string;
      body?: unknown;
      procedureName?: string;
    } = {}
  ): string {
    const {
      endpoint = '/api/trpc',
      method = 'POST',
      body = { input: {} },
      procedureName = 'procedureName',
    } = options;

    // Normalize base URL
    let baseUrl = environment.baseUrl;
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }

    // Remove trailing slash from baseUrl and leading slash from endpoint
    baseUrl = baseUrl.replace(/\/$/, '');
    const normalizedEndpoint = endpoint.startsWith('/')
      ? endpoint
      : `/${endpoint}`;

    let url = `${baseUrl}${normalizedEndpoint}/${procedureName}`;

    // Escape header values
    const escapeHeaderValue = (value: string): string => {
      return value
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
    };

    // Build headers map to avoid duplicates
    const headersMap = new Map<string, string>();

    // Add default Content-Type
    headersMap.set('content-type', 'application/json');

    // Add environment headers (case-insensitive merge)
    Object.entries(environment.headers).forEach(([key, value]) => {
      headersMap.set(key.toLowerCase(), value);
    });

    // Convert to sorted array
    const headers = Array.from(headersMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `-H "${key}: ${escapeHeaderValue(value)}"`);

    const parts = [`curl -X ${method}`];

    // Handle GET requests with query parameters
    if (method === 'GET' && body && typeof body === 'object') {
      const queryParam = encodeURIComponent(JSON.stringify(body));
      url += `?input=${queryParam}`;
      parts.push(url);
    } else {
      parts.push(url);
    }

    // Add headers
    parts.push(...headers);

    // Add credentials flags
    if (environment.withCredentials) {
      parts.push('--include');
      parts.push('--cookie-jar cookies.txt');
      parts.push('--cookie cookies.txt');
    }

    // Add body for non-GET requests
    if (method !== 'GET') {
      const bodyStr = JSON.stringify(body, null, 0);
      parts.push(`-d '${bodyStr}'`);
    }

    return parts.join(' \\\n  ');
  }

  /**
   * Export environments to JSON
   */
  static exportEnvironments(environments: Environment[]): string {
    return JSON.stringify(environments, null, 2);
  }

  /**
   * Import environments from JSON
   */
  static importEnvironments(jsonString: string): Environment[] {
    try {
      const parsed = JSON.parse(jsonString);

      if (!Array.isArray(parsed)) {
        throw new Error('Invalid format: expected array of environments');
      }

      // Validate each environment has required fields
      const validated = parsed.map((env, index) => {
        if (!env.id || !env.name || !env.baseUrl) {
          throw new Error(
            `Invalid environment at index ${index}: missing required fields`
          );
        }

        return {
          id: env.id,
          name: env.name,
          baseUrl: env.baseUrl,
          headers: env.headers || {},
          withCredentials: Boolean(env.withCredentials),
        };
      });

      return validated;
    } catch (error) {
      throw new Error(
        `Failed to import environments: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate environment configuration
   */
  static validateEnvironment(environment: Partial<Environment>): string[] {
    const errors: string[] = [];

    if (!environment.name?.trim()) {
      errors.push('Name is required');
    }

    if (!environment.baseUrl?.trim()) {
      errors.push('Base URL is required');
    } else {
      try {
        new URL(environment.baseUrl);
      } catch {
        errors.push('Base URL must be a valid URL');
      }
    }

    // Validate headers
    if (environment.headers) {
      Object.entries(environment.headers).forEach(([key, value]) => {
        if (!key.trim()) {
          errors.push('Header names cannot be empty');
        }
        if (typeof value !== 'string') {
          errors.push(`Header "${key}" must have a string value`);
        }
      });
    }

    return errors;
  }

  /**
   * Find environment by ID
   */
  static findEnvironment(
    environments: Environment[],
    environmentId: string
  ): Environment | undefined {
    return environments.find(env => env.id === environmentId);
  }

  /**
   * Get default environment (first one)
   */
  static getDefaultEnvironment(
    environments: Environment[]
  ): Environment | undefined {
    return environments[0];
  }

  /**
   * Clear all environments and reset to defaults
   */
  static resetToDefaults(): Environment[] {
    this.saveEnvironments(DEFAULT_ENVIRONMENTS);
    return DEFAULT_ENVIRONMENTS;
  }
}
