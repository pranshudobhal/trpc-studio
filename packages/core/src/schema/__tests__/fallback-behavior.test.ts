/**
 * Tests for schema conversion fallback behavior and x-zod annotations
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { convertZodToJsonSchema } from '../converter';

describe('Schema Conversion Fallback Behavior', () => {
  describe('x-zod.unmapped fallback', () => {
    it('should emit x-zod.unmapped for unsupported Zod types', () => {
      // Create a schema with an unsupported type
      const schema = z.string();

      // Mock the type to be unsupported
      Object.defineProperty(schema._def, 'typeName', {
        value: 'ZodUnsupported',
        writable: false,
      });

      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        'x-zod': {
          unmapped: true,
          reason: 'Unsupported type: ZodUnsupported',
        },
      });
      expect(result.hasUnmappedNodes).toBe(true);
      expect(
        result.warnings.some(w => w.includes('Unsupported Zod type'))
      ).toBe(true);
    });

    it('should handle lazy schema resolution failures', () => {
      const lazySchema = z.lazy(() => {
        throw new Error('Lazy schema failed');
      });

      const result = convertZodToJsonSchema(lazySchema);

      expect(result.schema).toEqual({
        'x-zod': {
          unmapped: true,
          reason: 'Failed to resolve lazy schema',
        },
      });
      expect(result.hasUnmappedNodes).toBe(true);
      expect(result.warnings).toContain('Failed to resolve lazy schema');
    });

    it('should handle maximum depth exceeded', () => {
      // Create a deeply nested schema
      let deepSchema: z.ZodTypeAny = z.string();
      for (let i = 0; i < 15; i++) {
        deepSchema = z.object({ nested: deepSchema });
      }

      const result = convertZodToJsonSchema(deepSchema, { maxDepth: 5 });

      expect(result.warnings.some(w => w.includes('Maximum depth'))).toBe(true);
    });

    it('should handle circular references', () => {
      interface Node {
        value: string;
        child?: Node;
      }

      const nodeSchema: z.ZodType<Node> = z.lazy(() =>
        z.object({
          value: z.string(),
          child: nodeSchema.optional(),
        })
      );

      const result = convertZodToJsonSchema(nodeSchema);

      // Should complete without infinite recursion
      expect(result.schema.type).toBe('object');
      expect(result.schema.properties?.value).toEqual({ type: 'string' });
    });
  });

  describe('x-zod annotations for refinements', () => {
    it('should annotate custom refinements', () => {
      const schema = z
        .string()
        .refine(val => val.length > 5, 'Must be longer than 5 characters');

      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'string',
        'x-zod': {
          refinements: ['custom-refinement'],
        },
      });
    });

    it('should annotate transform operations', () => {
      const schema = z.string().transform(val => val.toUpperCase());

      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'string',
        'x-zod': {
          refinements: ['transform'],
        },
      });
    });

    it('should annotate preprocess operations', () => {
      const schema = z.preprocess(val => String(val), z.string());

      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'string',
        'x-zod': {
          refinements: ['preprocess'],
        },
      });
    });

    it('should annotate multiple refinements', () => {
      const schema = z
        .string()
        .refine(val => val.length > 3, 'Too short')
        .transform(val => val.trim())
        .refine(val => !val.includes(' '), 'No spaces allowed');

      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'string',
        'x-zod': {
          refinements: ['custom-refinement', 'transform', 'custom-refinement'],
        },
      });
    });

    it('should handle string refinements like startsWith and endsWith', () => {
      const schema = z.string().startsWith('prefix').endsWith('suffix');

      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'string',
        'x-zod': {
          refinements: ['startsWith:prefix', 'endsWith:suffix'],
        },
      });
    });

    it('should handle number refinements like finite and safe', () => {
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

  describe('Special type annotations', () => {
    it('should annotate BigInt types', () => {
      const schema = z.bigint();

      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'integer',
        'x-zod': {
          bigint: true,
        },
      });
    });

    it('should annotate Date types', () => {
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

    it('should annotate Map types with warning', () => {
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

    it('should annotate Set types with warning', () => {
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

  describe('Wrapper type handling', () => {
    it('should unwrap branded types', () => {
      const schema = z.string().brand<'UserId'>();

      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'string',
      });
    });

    it('should unwrap catch types', () => {
      const schema = z.string().catch('fallback');

      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'string',
      });
    });

    it('should unwrap promise types', () => {
      const schema = z.promise(z.string());

      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'string',
      });
    });

    it('should handle pipeline types', () => {
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

  describe('Complex scenarios', () => {
    it('should handle mixed success and failure in objects', () => {
      const validSchema = z.string();
      const unsupportedSchema = z.string();

      // Make one schema unsupported
      Object.defineProperty(unsupportedSchema._def, 'typeName', {
        value: 'ZodUnsupported',
        writable: false,
      });

      const objectSchema = z.object({
        validProp: validSchema,
        unsupportedProp: unsupportedSchema,
        anotherValidProp: z.number(),
      });

      const result = convertZodToJsonSchema(objectSchema);

      expect(result.schema.type).toBe('object');
      expect(result.schema.properties?.validProp).toEqual({ type: 'string' });
      expect(result.schema.properties?.anotherValidProp).toEqual({
        type: 'number',
      });
      expect(result.schema.properties?.unsupportedProp).toEqual({
        'x-zod': {
          unmapped: true,
          reason: 'Unsupported type: ZodUnsupported',
        },
      });
      expect(result.hasUnmappedNodes).toBe(true);
      expect(result.schema.required).toEqual([
        'validProp',
        'unsupportedProp',
        'anotherValidProp',
      ]);
    });

    it('should accumulate warnings from multiple failures', () => {
      const schema1 = z.string();
      const schema2 = z.number();

      Object.defineProperty(schema1._def, 'typeName', {
        value: 'ZodUnsupported1',
        writable: false,
      });

      Object.defineProperty(schema2._def, 'typeName', {
        value: 'ZodUnsupported2',
        writable: false,
      });

      const unionSchema = z.union([schema1, schema2]);

      const result = convertZodToJsonSchema(unionSchema);

      expect(result.warnings).toHaveLength(2);
      expect(result.warnings.some(w => w.includes('ZodUnsupported1'))).toBe(
        true
      );
      expect(result.warnings.some(w => w.includes('ZodUnsupported2'))).toBe(
        true
      );
      expect(result.hasUnmappedNodes).toBe(true);
    });

    it('should handle nested objects with partial failures', () => {
      const unsupportedSchema = z.string();
      Object.defineProperty(unsupportedSchema._def, 'typeName', {
        value: 'ZodUnsupported',
        writable: false,
      });

      const nestedSchema = z.object({
        user: z.object({
          name: z.string(),
          invalidField: unsupportedSchema,
        }),
        settings: z.object({
          theme: z.string(),
        }),
      });

      const result = convertZodToJsonSchema(nestedSchema);

      expect(result.schema.type).toBe('object');
      expect(result.schema.properties?.user.properties?.name).toEqual({
        type: 'string',
      });
      expect(result.schema.properties?.user.properties?.invalidField).toEqual({
        'x-zod': {
          unmapped: true,
          reason: 'Unsupported type: ZodUnsupported',
        },
      });
      expect(result.schema.properties?.settings.properties?.theme).toEqual({
        type: 'string',
      });
      expect(result.hasUnmappedNodes).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty objects', () => {
      const schema = z.object({});

      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'object',
        properties: {},
      });
      expect(result.hasUnmappedNodes).toBe(false);
    });

    it('should handle empty arrays', () => {
      const schema = z.array(z.string()).length(0);

      const result = convertZodToJsonSchema(schema);

      expect(result.schema).toEqual({
        type: 'array',
        items: { type: 'string' },
        minItems: 0,
        maxItems: 0,
      });
    });

    it('should handle complex union types', () => {
      const schema = z.union([
        z.string(),
        z.number(),
        z.object({ type: z.literal('object'), data: z.unknown() }),
        z.array(z.boolean()),
      ]);

      const result = convertZodToJsonSchema(schema);

      expect(result.schema.anyOf).toHaveLength(4);
      expect(result.schema.anyOf?.[0]).toEqual({ type: 'string' });
      expect(result.schema.anyOf?.[1]).toEqual({ type: 'number' });
      expect(result.schema.anyOf?.[2].type).toBe('object');
      expect(result.schema.anyOf?.[3].type).toBe('array');
    });
  });
});
