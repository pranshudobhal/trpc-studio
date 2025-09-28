import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { convertZodToJsonSchema } from '../converter';
import type { JSONSchema } from '../../types/schema';

describe('convertZodToJsonSchema', () => {
  describe('primitive types', () => {
    it('should convert string schema', () => {
      const schema = z.string();
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'string',
      });
      expect(result.hasUnmappedNodes).toBe(false);
      expect(result.warnings).toHaveLength(0);
    });

    it('should convert number schema', () => {
      const schema = z.number();
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'number',
      });
      expect(result.hasUnmappedNodes).toBe(false);
    });

    it('should convert integer schema', () => {
      const schema = z.number().int();
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'integer',
      });
    });

    it('should convert boolean schema', () => {
      const schema = z.boolean();
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'boolean',
      });
    });

    it('should convert date schema', () => {
      const schema = z.date();
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'string',
        format: 'date-time',
        'x-zod': {
          date: true,
        },
      });
    });

    it('should convert bigint schema', () => {
      const schema = z.bigint();
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'integer',
        'x-zod': {
          bigint: true,
        },
      });
    });

    it('should convert null schema', () => {
      const schema = z.null();
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'null',
      });
    });

    it('should convert undefined schema', () => {
      const schema = z.undefined();
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'null',
      });
    });

    it('should convert any schema', () => {
      const schema = z.any();
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({});
    });

    it('should convert unknown schema', () => {
      const schema = z.unknown();
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({});
    });
  });

  describe('string constraints', () => {
    it('should convert string with min/max length', () => {
      const schema = z.string().min(3).max(10);
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'string',
        minLength: 3,
        maxLength: 10,
      });
    });

    it('should convert string with exact length', () => {
      const schema = z.string().length(5);
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'string',
        minLength: 5,
        maxLength: 5,
      });
    });

    it('should convert email string', () => {
      const schema = z.string().email();
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'string',
        format: 'email',
      });
    });

    it('should convert url string', () => {
      const schema = z.string().url();
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'string',
        format: 'uri',
      });
    });

    it('should convert uuid string', () => {
      const schema = z.string().uuid();
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'string',
        format: 'uuid',
      });
    });

    it('should convert regex pattern', () => {
      const schema = z.string().regex(/^[a-z]+$/);
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'string',
        pattern: '^[a-z]+$',
      });
    });

    it('should handle non-standard string refinements', () => {
      const schema = z.string().startsWith('prefix').endsWith('suffix');
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'string',
        'x-zod': {
          refinements: ['startsWith:prefix', 'endsWith:suffix'],
        },
      });
    });
  });

  describe('number constraints', () => {
    it('should convert number with min/max', () => {
      const schema = z.number().min(0).max(100);
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'number',
        minimum: 0,
        maximum: 100,
      });
    });

    it('should convert number with exclusive bounds', () => {
      const schema = z.number().gt(0).lt(100);
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'number',
        exclusiveMinimum: 0,
        exclusiveMaximum: 100,
      });
    });

    it('should convert number with multipleOf', () => {
      const schema = z.number().multipleOf(5);
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'number',
        multipleOf: 5,
      });
    });

    it('should handle non-standard number refinements', () => {
      const schema = z.number().finite().safe();
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'number',
        minimum: Number.MIN_SAFE_INTEGER,
        maximum: Number.MAX_SAFE_INTEGER,
        'x-zod': {
          refinements: ['finite'],
        },
      });
    });
  });

  describe('literal and enum types', () => {
    it('should convert string literal', () => {
      const schema = z.literal('hello');
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        const: 'hello',
        type: 'string',
      });
    });

    it('should convert number literal', () => {
      const schema = z.literal(42);
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        const: 42,
        type: 'number',
      });
    });

    it('should convert enum', () => {
      const schema = z.enum(['red', 'green', 'blue']);
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'string',
        enum: ['red', 'green', 'blue'],
      });
    });

    it('should convert native enum', () => {
      enum Color {
        Red = 'red',
        Green = 'green',
        Blue = 'blue',
      }
      const schema = z.nativeEnum(Color);
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        enum: ['red', 'green', 'blue'],
      });
    });
  });

  describe('object schemas', () => {
    it('should convert simple object', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
        required: ['name', 'age'],
      });
    });

    it('should handle optional properties', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number().optional(),
        email: z.string().optional(),
      });
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
          email: { type: 'string' },
        },
        required: ['name'],
      });
    });

    it('should handle nested objects', () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          profile: z.object({
            bio: z.string(),
          }),
        }),
      });
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              profile: {
                type: 'object',
                properties: {
                  bio: { type: 'string' },
                },
                required: ['bio'],
              },
            },
            required: ['name', 'profile'],
          },
        },
        required: ['user'],
      });
    });

    it('should handle passthrough objects', () => {
      const schema = z
        .object({
          name: z.string(),
        })
        .passthrough();
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
        additionalProperties: true,
      });
    });

    it('should handle strict objects', () => {
      const schema = z
        .object({
          name: z.string(),
        })
        .strict();
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
        additionalProperties: false,
      });
    });
  });

  describe('array schemas', () => {
    it('should convert simple array', () => {
      const schema = z.array(z.string());
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'array',
        items: { type: 'string' },
      });
    });

    it('should convert array with constraints', () => {
      const schema = z.array(z.number()).min(1).max(10);
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'array',
        items: { type: 'number' },
        minItems: 1,
        maxItems: 10,
      });
    });

    it('should convert array with exact length', () => {
      const schema = z.array(z.string()).length(5);
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'array',
        items: { type: 'string' },
        minItems: 5,
        maxItems: 5,
      });
    });

    it('should convert nested arrays', () => {
      const schema = z.array(z.array(z.number()));
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'array',
        items: {
          type: 'array',
          items: { type: 'number' },
        },
      });
    });
  });

  describe('tuple schemas', () => {
    it('should convert simple tuple', () => {
      const schema = z.tuple([z.string(), z.number()]);
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'array',
        items: {
          anyOf: [{ type: 'string' }, { type: 'number' }],
        },
        minItems: 2,
        maxItems: 2,
      });
    });

    it('should convert tuple with rest', () => {
      const schema = z.tuple([z.string(), z.number()]).rest(z.boolean());
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'array',
        items: {
          anyOf: [{ type: 'string' }, { type: 'number' }],
        },
        minItems: 2,
        additionalItems: { type: 'boolean' },
      });
    });
  });

  describe('union schemas', () => {
    it('should convert simple union', () => {
      const schema = z.union([z.string(), z.number()]);
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        anyOf: [{ type: 'string' }, { type: 'number' }],
      });
    });

    it('should convert complex union', () => {
      const schema = z.union([
        z.object({ type: z.literal('user'), name: z.string() }),
        z.object({
          type: z.literal('admin'),
          permissions: z.array(z.string()),
        }),
      ]);
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        anyOf: [
          {
            type: 'object',
            properties: {
              type: { const: 'user', type: 'string' },
              name: { type: 'string' },
            },
            required: ['type', 'name'],
          },
          {
            type: 'object',
            properties: {
              type: { const: 'admin', type: 'string' },
              permissions: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['type', 'permissions'],
          },
        ],
      });
    });
  });

  describe('discriminated union schemas', () => {
    it('should convert discriminated union', () => {
      const schema = z.discriminatedUnion('type', [
        z.object({ type: z.literal('user'), name: z.string() }),
        z.object({
          type: z.literal('admin'),
          permissions: z.array(z.string()),
        }),
      ]);
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        oneOf: [
          {
            type: 'object',
            properties: {
              type: { const: 'user', type: 'string' },
              name: { type: 'string' },
            },
            required: ['type', 'name'],
          },
          {
            type: 'object',
            properties: {
              type: { const: 'admin', type: 'string' },
              permissions: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['type', 'permissions'],
          },
        ],
        discriminator: {
          propertyName: 'type',
        },
      });
    });
  });

  describe('intersection schemas', () => {
    it('should convert intersection', () => {
      const schema = z.intersection(
        z.object({ name: z.string() }),
        z.object({ age: z.number() })
      );
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        allOf: [
          {
            type: 'object',
            properties: { name: { type: 'string' } },
            required: ['name'],
          },
          {
            type: 'object',
            properties: { age: { type: 'number' } },
            required: ['age'],
          },
        ],
      });
    });
  });

  describe('record schemas', () => {
    it('should convert record', () => {
      const schema = z.record(z.string());
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'object',
        additionalProperties: { type: 'string' },
      });
    });

    it('should convert record with key type', () => {
      const schema = z.record(z.string(), z.number());
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'object',
        additionalProperties: { type: 'number' },
      });
    });
  });

  describe('map and set schemas', () => {
    it('should convert map to object', () => {
      const schema = z.map(z.string(), z.number());
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'object',
        additionalProperties: { type: 'number' },
        'x-zod': {
          map: true,
        },
      });
      expect(result.warnings).toContain(
        'Map type converted to object with string keys'
      );
    });

    it('should convert set to array', () => {
      const schema = z.set(z.string());
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'array',
        items: { type: 'string' },
        uniqueItems: true,
        'x-zod': {
          set: true,
        },
      });
      expect(result.warnings).toContain(
        'Set type converted to array with unique items'
      );
    });
  });

  describe('nullable and optional schemas', () => {
    it('should convert nullable schema', () => {
      const schema = z.string().nullable();
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        anyOf: [{ type: 'string' }, { type: 'null' }],
      });
    });

    it('should convert optional schema', () => {
      const schema = z.string().optional();
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'string',
      });
    });

    it('should convert nullable optional schema', () => {
      const schema = z.string().nullable().optional();
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        anyOf: [{ type: 'string' }, { type: 'null' }],
      });
    });
  });

  describe('default values', () => {
    it('should include default values when enabled', () => {
      const schema = z.string().default('hello');
      const result = convertZodToJsonSchema(schema, { includeDefaults: true });

      expect(result.schema).toEqual({
        type: 'string',
        default: 'hello',
      });
    });

    it('should exclude default values when disabled', () => {
      const schema = z.string().default('hello');
      const result = convertZodToJsonSchema(schema, { includeDefaults: false });

      expect(result.schema).toEqual({
        type: 'string',
      });
    });

    it('should handle function defaults', () => {
      const schema = z.string().default(() => 'dynamic');
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'string',
        default: 'dynamic',
      });
    });
  });

  describe('refinements and effects', () => {
    it('should handle custom refinements', () => {
      const schema = z
        .string()
        .refine(val => val.length > 0, 'Must not be empty');
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'string',
        'x-zod': {
          refinements: ['custom-refinement'],
        },
      });
    });

    it('should handle transforms', () => {
      const schema = z.string().transform(val => val.toUpperCase());
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'string',
        'x-zod': {
          refinements: ['transform'],
        },
      });
    });

    it('should handle preprocess', () => {
      const schema = z.preprocess(val => String(val), z.string());
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'string',
        'x-zod': {
          refinements: ['preprocess'],
        },
      });
    });
  });

  describe('lazy schemas', () => {
    it('should handle lazy schemas', () => {
      interface Node {
        value: string;
        children?: Node[];
      }

      const nodeSchema: z.ZodType<Node> = z.lazy(() =>
        z.object({
          value: z.string(),
          children: z.array(nodeSchema).optional(),
        })
      );

      const result = convertZodToJsonSchema(nodeSchema);

      expect(result.schema.type).toBe('object');
      expect(result.schema.properties).toBeDefined();
      expect(result.schema.properties!.value).toEqual({ type: 'string' });
    });

    it('should handle failing lazy schemas', () => {
      const schema = z.lazy(() => {
        throw new Error('Lazy schema failed');
      });

      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        'x-zod': {
          unmapped: true,
          reason: 'Failed to resolve lazy schema',
        },
      });
      expect(result.warnings).toContain('Failed to resolve lazy schema');
      expect(result.hasUnmappedNodes).toBe(true);
    });
  });

  describe('wrapper types', () => {
    it('should handle promise schemas', () => {
      const schema = z.promise(z.string());
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'string',
      });
    });

    it('should handle branded schemas', () => {
      const schema = z.string().brand<'UserId'>();
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'string',
      });
    });

    it('should handle catch schemas', () => {
      const schema = z.string().catch('fallback');
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'string',
      });
    });

    it('should handle pipeline schemas', () => {
      const schema = z
        .string()
        .pipe(z.string().transform(s => s.toUpperCase()));
      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'string',
        'x-zod': {
          refinements: ['transform'],
        },
      });
    });
  });

  describe('descriptions', () => {
    it('should include descriptions when enabled', () => {
      const schema = z.string().describe('A user name');
      const result = convertZodToJsonSchema(schema, {
        includeDescriptions: true,
      });

      expect(result.schema).toEqual({
        type: 'string',
        description: 'A user name',
      });
    });

    it('should exclude descriptions when disabled', () => {
      const schema = z.string().describe('A user name');
      const result = convertZodToJsonSchema(schema, {
        includeDescriptions: false,
      });

      expect(result.schema).toEqual({
        type: 'string',
      });
    });
  });

  describe('fallback behavior', () => {
    it('should handle unsupported types with fallback', () => {
      // Create a mock unsupported schema by modifying the _def
      const schema = z.string();
      (schema._def as any).typeName = 'ZodUnsupported';

      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        'x-zod': {
          unmapped: true,
          reason: 'Unsupported type: ZodUnsupported',
        },
      });
      expect(result.hasUnmappedNodes).toBe(true);
      expect(result.warnings).toContain('Unsupported Zod type: ZodUnsupported');
    });

    it('should handle maximum depth exceeded', () => {
      const deepSchema = z.object({
        level1: z.object({
          level2: z.object({
            level3: z.string(),
          }),
        }),
      });

      const result = convertZodToJsonSchema(deepSchema, { maxDepth: 2 });

      expect(result.warnings).toContain('Maximum depth (2) exceeded');
    });

    it('should handle circular references', () => {
      interface Node {
        value: string;
        parent?: Node;
      }

      const nodeSchema: z.ZodType<Node> = z.lazy(() =>
        z.object({
          value: z.string(),
          parent: nodeSchema.optional(),
        })
      );

      const result = convertZodToJsonSchema(nodeSchema);

      // Should complete without infinite recursion
      expect(result.schema.type).toBe('object');
    });

    it('should handle conversion errors gracefully', () => {
      // Create a schema that will throw during conversion
      const schema = z.string();
      const originalConvert = schema._def;

      // Mock a conversion that throws
      Object.defineProperty(schema, '_def', {
        get() {
          throw new Error('Conversion error');
        },
      });

      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        'x-zod': {
          unmapped: true,
          reason: 'Conversion failed',
        },
      });
      expect(result.hasUnmappedNodes).toBe(true);
      expect(result.warnings.some(w => w.includes('Conversion failed'))).toBe(
        true
      );
    });
  });

  describe('complex real-world schemas', () => {
    it('should handle user profile schema', () => {
      const userSchema = z.object({
        id: z.string().uuid(),
        email: z.string().email(),
        name: z.string().min(1).max(100),
        age: z.number().int().min(0).max(150).optional(),
        role: z.enum(['user', 'admin', 'moderator']),
        preferences: z.object({
          theme: z.enum(['light', 'dark']).default('light'),
          notifications: z.boolean().default(true),
        }),
        tags: z.array(z.string()).max(10),
        metadata: z.record(z.unknown()).optional(),
        createdAt: z.date(),
        updatedAt: z.date().optional(),
      });

      const result = convertZodToJsonSchema(userSchema);

      expect(result.schema.type).toBe('object');
      expect(result.schema.required).toEqual([
        'id',
        'email',
        'name',
        'role',
        'preferences',
        'tags',
        'createdAt',
      ]);
      expect(result.schema.properties!.id).toEqual({
        type: 'string',
        format: 'uuid',
      });
      expect(result.schema.properties!.email).toEqual({
        type: 'string',
        format: 'email',
      });
      expect(result.schema.properties!.preferences).toEqual({
        type: 'object',
        properties: {
          theme: {
            type: 'string',
            enum: ['light', 'dark'],
            default: 'light',
          },
          notifications: {
            type: 'boolean',
            default: true,
          },
        },
        // Properties with defaults are optional, so no required array
      });
    });

    it('should handle API response schema with unions', () => {
      const apiResponseSchema = z.discriminatedUnion('status', [
        z.object({
          status: z.literal('success'),
          data: z.object({
            users: z.array(
              z.object({
                id: z.string(),
                name: z.string(),
              })
            ),
            total: z.number(),
          }),
        }),
        z.object({
          status: z.literal('error'),
          error: z.object({
            code: z.string(),
            message: z.string(),
            details: z.unknown().optional(),
          }),
        }),
      ]);

      const result = convertZodToJsonSchema(apiResponseSchema);

      expect(result.schema.oneOf).toHaveLength(2);
      expect(result.schema.discriminator).toEqual({
        propertyName: 'status',
      });
      expect(result.hasUnmappedNodes).toBe(false);
    });
  });
});
