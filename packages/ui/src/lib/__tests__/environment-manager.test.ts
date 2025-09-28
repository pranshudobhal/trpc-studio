import {
  EnvironmentManager,
  DEFAULT_ENVIRONMENTS,
} from '../environment-manager';
import type { Environment } from '../../components/environment-selector';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('EnvironmentManager', () => {
  const mockEnvironments: Environment[] = [
    {
      id: 'test1',
      name: 'Test Environment 1',
      baseUrl: 'https://test1.example.com',
      headers: { 'x-api-key': 'key1' },
      withCredentials: true,
    },
    {
      id: 'test2',
      name: 'Test Environment 2',
      baseUrl: 'https://test2.example.com',
      headers: {},
      withCredentials: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadEnvironments', () => {
    it('loads environments from localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify(mockEnvironments)
      );

      const result = EnvironmentManager.loadEnvironments();

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(
        'trpc-studio-environments'
      );
      expect(result).toEqual(mockEnvironments);
    });

    it('returns default environments when localStorage is empty', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = EnvironmentManager.loadEnvironments();

      expect(result).toEqual(DEFAULT_ENVIRONMENTS);
    });

    it('returns default environments when localStorage contains invalid JSON', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = EnvironmentManager.loadEnvironments();

      expect(result).toEqual(DEFAULT_ENVIRONMENTS);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load environments from localStorage:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('returns default environments when localStorage contains empty array', () => {
      mockLocalStorage.getItem.mockReturnValue('[]');

      const result = EnvironmentManager.loadEnvironments();

      expect(result).toEqual(DEFAULT_ENVIRONMENTS);
    });

    it('returns default environments when localStorage contains non-array', () => {
      mockLocalStorage.getItem.mockReturnValue('{"not": "array"}');

      const result = EnvironmentManager.loadEnvironments();

      expect(result).toEqual(DEFAULT_ENVIRONMENTS);
    });
  });

  describe('saveEnvironments', () => {
    it('saves environments to localStorage', () => {
      EnvironmentManager.saveEnvironments(mockEnvironments);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'trpc-studio-environments',
        JSON.stringify(mockEnvironments)
      );
    });

    it('handles localStorage errors gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      EnvironmentManager.saveEnvironments(mockEnvironments);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save environments to localStorage:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('createEnvironment', () => {
    it('creates a new environment with generated ID', () => {
      const newEnv = {
        name: 'New Environment',
        baseUrl: 'https://new.example.com',
        headers: { authorization: 'Bearer token' },
        withCredentials: true,
      };

      const result = EnvironmentManager.createEnvironment(
        mockEnvironments,
        newEnv
      );

      expect(result).toHaveLength(3);
      expect(result[2]).toMatchObject(newEnv);
      expect(result[2].id).toMatch(/^env_\d+_[a-z0-9]+$/);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('generates unique IDs for multiple environments', () => {
      const newEnv1 = {
        name: 'New Environment 1',
        baseUrl: 'https://new1.example.com',
        headers: {},
        withCredentials: false,
      };

      const newEnv2 = {
        name: 'New Environment 2',
        baseUrl: 'https://new2.example.com',
        headers: {},
        withCredentials: false,
      };

      const result1 = EnvironmentManager.createEnvironment(
        mockEnvironments,
        newEnv1
      );
      const result2 = EnvironmentManager.createEnvironment(result1, newEnv2);

      expect(result2).toHaveLength(4);
      expect(result2[2].id).not.toBe(result2[3].id);
    });
  });

  describe('updateEnvironment', () => {
    it('updates an existing environment', () => {
      const updates = {
        name: 'Updated Name',
        baseUrl: 'https://updated.example.com',
      };

      const result = EnvironmentManager.updateEnvironment(
        mockEnvironments,
        'test1',
        updates
      );

      expect(result[0]).toMatchObject({
        id: 'test1',
        name: 'Updated Name',
        baseUrl: 'https://updated.example.com',
        headers: { 'x-api-key': 'key1' }, // Should preserve existing headers
        withCredentials: true,
      });
      expect(result[1]).toEqual(mockEnvironments[1]); // Should not affect other environments
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('does nothing if environment ID not found', () => {
      const updates = { name: 'Updated Name' };

      const result = EnvironmentManager.updateEnvironment(
        mockEnvironments,
        'nonexistent',
        updates
      );

      expect(result).toEqual(mockEnvironments);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('deleteEnvironment', () => {
    it('deletes an environment by ID', () => {
      const result = EnvironmentManager.deleteEnvironment(
        mockEnvironments,
        'test1'
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockEnvironments[1]);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('does nothing if environment ID not found', () => {
      const result = EnvironmentManager.deleteEnvironment(
        mockEnvironments,
        'nonexistent'
      );

      expect(result).toEqual(mockEnvironments);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('generateCurlCommand', () => {
    const testEnv: Environment = {
      id: 'test',
      name: 'Test',
      baseUrl: 'https://api.example.com',
      headers: {
        authorization: 'Bearer token123',
        'x-api-key': 'key456',
      },
      withCredentials: true,
    };

    it('generates basic cURL command', () => {
      const result = EnvironmentManager.generateCurlCommand(testEnv);

      expect(result).toContain('curl -X POST');
      expect(result).toContain(
        'https://api.example.com/api/trpc/procedureName'
      );
      expect(result).toContain('-H "Content-Type: application/json"');
      expect(result).toContain('-H "authorization: Bearer token123"');
      expect(result).toContain('-H "x-api-key: key456"');
      expect(result).toContain('--include');
      expect(result).toContain('-d \'{"input":{}}\'');
    });

    it('generates cURL command with custom options', () => {
      const options = {
        endpoint: '/api/custom',
        method: 'GET',
        body: { custom: 'data' },
        procedureName: 'customProcedure',
      };

      const result = EnvironmentManager.generateCurlCommand(testEnv, options);

      expect(result).toContain('curl -X GET');
      expect(result).toContain(
        'https://api.example.com/api/custom/customProcedure'
      );
      expect(result).toContain('-d \'{"custom":"data"}\'');
    });

    it('omits credentials flag when withCredentials is false', () => {
      const envWithoutCredentials = { ...testEnv, withCredentials: false };

      const result = EnvironmentManager.generateCurlCommand(
        envWithoutCredentials
      );

      expect(result).not.toContain('--include');
    });

    it('handles environment with no headers', () => {
      const envWithoutHeaders = { ...testEnv, headers: {} };

      const result = EnvironmentManager.generateCurlCommand(envWithoutHeaders);

      expect(result).toContain('-H "Content-Type: application/json"');
      expect(result).not.toContain('authorization');
      expect(result).not.toContain('x-api-key');
    });
  });

  describe('exportEnvironments', () => {
    it('exports environments as formatted JSON', () => {
      const result = EnvironmentManager.exportEnvironments(mockEnvironments);

      expect(result).toBe(JSON.stringify(mockEnvironments, null, 2));
    });
  });

  describe('importEnvironments', () => {
    it('imports valid environments JSON', () => {
      const jsonString = JSON.stringify(mockEnvironments);

      const result = EnvironmentManager.importEnvironments(jsonString);

      expect(result).toEqual(mockEnvironments);
    });

    it('throws error for invalid JSON', () => {
      expect(() => {
        EnvironmentManager.importEnvironments('invalid-json');
      }).toThrow('Failed to import environments');
    });

    it('throws error for non-array JSON', () => {
      expect(() => {
        EnvironmentManager.importEnvironments('{"not": "array"}');
      }).toThrow('Invalid format: expected array of environments');
    });

    it('throws error for environments missing required fields', () => {
      const invalidEnvironments = [
        { id: 'test', name: 'Test' }, // missing baseUrl
      ];

      expect(() => {
        EnvironmentManager.importEnvironments(
          JSON.stringify(invalidEnvironments)
        );
      }).toThrow('Invalid environment at index 0: missing required fields');
    });

    it('normalizes imported environments', () => {
      const partialEnvironments = [
        {
          id: 'test',
          name: 'Test',
          baseUrl: 'https://test.com',
          // missing headers and withCredentials
        },
      ];

      const result = EnvironmentManager.importEnvironments(
        JSON.stringify(partialEnvironments)
      );

      expect(result[0]).toEqual({
        id: 'test',
        name: 'Test',
        baseUrl: 'https://test.com',
        headers: {},
        withCredentials: false,
      });
    });
  });

  describe('validateEnvironment', () => {
    it('returns no errors for valid environment', () => {
      const validEnv = {
        name: 'Valid Environment',
        baseUrl: 'https://valid.example.com',
        headers: { 'x-api-key': 'valid-key' },
        withCredentials: true,
      };

      const errors = EnvironmentManager.validateEnvironment(validEnv);

      expect(errors).toEqual([]);
    });

    it('returns error for missing name', () => {
      const invalidEnv = {
        baseUrl: 'https://valid.example.com',
      };

      const errors = EnvironmentManager.validateEnvironment(invalidEnv);

      expect(errors).toContain('Name is required');
    });

    it('returns error for empty name', () => {
      const invalidEnv = {
        name: '   ',
        baseUrl: 'https://valid.example.com',
      };

      const errors = EnvironmentManager.validateEnvironment(invalidEnv);

      expect(errors).toContain('Name is required');
    });

    it('returns error for missing baseUrl', () => {
      const invalidEnv = {
        name: 'Valid Name',
      };

      const errors = EnvironmentManager.validateEnvironment(invalidEnv);

      expect(errors).toContain('Base URL is required');
    });

    it('returns error for invalid baseUrl', () => {
      const invalidEnv = {
        name: 'Valid Name',
        baseUrl: 'not-a-valid-url',
      };

      const errors = EnvironmentManager.validateEnvironment(invalidEnv);

      expect(errors).toContain('Base URL must be a valid URL');
    });

    it('returns error for empty header names', () => {
      const invalidEnv = {
        name: 'Valid Name',
        baseUrl: 'https://valid.example.com',
        headers: { '': 'value' },
      };

      const errors = EnvironmentManager.validateEnvironment(invalidEnv);

      expect(errors).toContain('Header names cannot be empty');
    });

    it('returns error for non-string header values', () => {
      const invalidEnv = {
        name: 'Valid Name',
        baseUrl: 'https://valid.example.com',
        headers: { 'x-api-key': 123 as any },
      };

      const errors = EnvironmentManager.validateEnvironment(invalidEnv);

      expect(errors).toContain('Header "x-api-key" must have a string value');
    });

    it('returns multiple errors for multiple issues', () => {
      const invalidEnv = {
        name: '',
        baseUrl: 'invalid-url',
        headers: { '': 'value', 'valid-key': 123 as any },
      };

      const errors = EnvironmentManager.validateEnvironment(invalidEnv);

      expect(errors).toHaveLength(4);
      expect(errors).toContain('Name is required');
      expect(errors).toContain('Base URL must be a valid URL');
      expect(errors).toContain('Header names cannot be empty');
      expect(errors).toContain('Header "valid-key" must have a string value');
    });
  });

  describe('findEnvironment', () => {
    it('finds environment by ID', () => {
      const result = EnvironmentManager.findEnvironment(
        mockEnvironments,
        'test1'
      );

      expect(result).toEqual(mockEnvironments[0]);
    });

    it('returns undefined for non-existent ID', () => {
      const result = EnvironmentManager.findEnvironment(
        mockEnvironments,
        'nonexistent'
      );

      expect(result).toBeUndefined();
    });
  });

  describe('getDefaultEnvironment', () => {
    it('returns first environment', () => {
      const result = EnvironmentManager.getDefaultEnvironment(mockEnvironments);

      expect(result).toEqual(mockEnvironments[0]);
    });

    it('returns undefined for empty array', () => {
      const result = EnvironmentManager.getDefaultEnvironment([]);

      expect(result).toBeUndefined();
    });
  });

  describe('resetToDefaults', () => {
    it('resets environments to defaults and saves to localStorage', () => {
      const result = EnvironmentManager.resetToDefaults();

      expect(result).toEqual(DEFAULT_ENVIRONMENTS);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'trpc-studio-environments',
        JSON.stringify(DEFAULT_ENVIRONMENTS)
      );
    });
  });
});
