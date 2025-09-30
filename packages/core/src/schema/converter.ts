import type { z } from 'zod';
import type { JSONSchema, SchemaConversionResult } from '../types/schema';

/**
 * Options for Zod to JSON Schema conversion
 */
export interface ConversionOptions {
  /**
   * Whether to include default values in the schema
   * @default true
   */
  includeDefaults?: boolean;

  /**
   * Whether to include descriptions from Zod schemas
   * @default true
   */
  includeDescriptions?: boolean;

  /**
   * Maximum depth for recursive schema conversion
   * @default 10
   */
  maxDepth?: number;
}

/**
 * Context for tracking conversion state
 */
interface ConversionContext {
  options: Required<ConversionOptions>;
  depth: number;
  warnings: string[];
  hasUnmappedNodes: boolean;
  seenSchemas: WeakSet<z.ZodTypeAny>;
}

/**
 * Convert a Zod schema to JSON Schema format
 */
export function convertZodToJsonSchema(
  zodSchema: z.ZodTypeAny,
  options: ConversionOptions = {}
): SchemaConversionResult {
  const ctx: ConversionContext = {
    options: {
      includeDefaults: options.includeDefaults ?? true,
      includeDescriptions: options.includeDescriptions ?? true,
      maxDepth: options.maxDepth ?? 10,
    },
    depth: 0,
    warnings: [],
    hasUnmappedNodes: false,
    seenSchemas: new WeakSet(),
  };

  const schema = convertSchema(zodSchema, ctx);

  return {
    schema,
    hasUnmappedNodes: ctx.hasUnmappedNodes,
    warnings: ctx.warnings,
  };
}

/**
 * Internal schema conversion function
 */
function convertSchema(
  zodSchema: z.ZodTypeAny,
  ctx: ConversionContext
): JSONSchema {
  // Prevent infinite recursion
  if (ctx.depth > ctx.options.maxDepth) {
    ctx.warnings.push(`Maximum depth (${ctx.options.maxDepth}) exceeded`);
    return createFallbackSchema('Maximum depth exceeded', ctx);
  }

  // Prevent circular references
  if (ctx.seenSchemas.has(zodSchema)) {
    ctx.warnings.push('Circular reference detected');
    return createFallbackSchema('Circular reference', ctx);
  }

  ctx.seenSchemas.add(zodSchema);
  ctx.depth++;

  try {
    const result = convertSchemaInternal(zodSchema, ctx);
    ctx.depth--;
    ctx.seenSchemas.delete(zodSchema);
    return result;
  } catch (error) {
    ctx.depth--;
    ctx.seenSchemas.delete(zodSchema);
    ctx.warnings.push(
      `Conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return createFallbackSchema('Conversion failed', ctx);
  }
}

/**
 * Create a fallback schema for unmapped nodes
 */
function createFallbackSchema(
  reason: string,
  ctx?: ConversionContext
): JSONSchema {
  if (ctx) {
    ctx.hasUnmappedNodes = true;
  }
  return {
    'x-zod': {
      unmapped: true,
      reason,
    },
  };
}

/**
 * Internal conversion logic for different Zod types
 */
function convertSchemaInternal(
  zodSchema: z.ZodTypeAny,
  ctx: ConversionContext
): JSONSchema {
  const def = zodSchema._def;
  const typeName = def.typeName as z.ZodFirstPartyTypeKind;

  // Handle base schema properties
  const baseSchema: JSONSchema = {};

  // Add description if available
  if (ctx.options.includeDescriptions && def.description) {
    baseSchema.description = def.description;
  }

  switch (typeName) {
    case 'ZodString':
      return convertZodString(zodSchema as z.ZodString, ctx, baseSchema);

    case 'ZodNumber':
      return convertZodNumber(zodSchema as z.ZodNumber, ctx, baseSchema);

    case 'ZodBigInt':
      return convertZodBigInt(zodSchema as z.ZodBigInt, ctx, baseSchema);

    case 'ZodBoolean':
      return convertZodBoolean(zodSchema as z.ZodBoolean, ctx, baseSchema);

    case 'ZodDate':
      return convertZodDate(zodSchema as z.ZodDate, ctx, baseSchema);

    case 'ZodUndefined':
    case 'ZodVoid':
      return { ...baseSchema, type: 'null' };

    case 'ZodNull':
      return { ...baseSchema, type: 'null' };

    case 'ZodAny':
    case 'ZodUnknown':
      return { ...baseSchema };

    case 'ZodLiteral':
      return convertZodLiteral(zodSchema as z.ZodLiteral<any>, ctx, baseSchema);

    case 'ZodEnum':
      return convertZodEnum(zodSchema as z.ZodEnum<any>, ctx, baseSchema);

    case 'ZodNativeEnum':
      return convertZodNativeEnum(
        zodSchema as z.ZodNativeEnum<any>,
        ctx,
        baseSchema
      );

    case 'ZodObject':
      return convertZodObject(zodSchema as z.ZodObject<any>, ctx, baseSchema);

    case 'ZodArray':
      return convertZodArray(zodSchema as z.ZodArray<any>, ctx, baseSchema);

    case 'ZodUnion':
      return convertZodUnion(zodSchema as z.ZodUnion<any>, ctx, baseSchema);

    case 'ZodDiscriminatedUnion':
      return convertZodDiscriminatedUnion(
        zodSchema as z.ZodDiscriminatedUnion<any, any>,
        ctx,
        baseSchema
      );

    case 'ZodIntersection':
      return convertZodIntersection(
        zodSchema as z.ZodIntersection<any, any>,
        ctx,
        baseSchema
      );

    case 'ZodTuple':
      return convertZodTuple(zodSchema as z.ZodTuple<any>, ctx, baseSchema);

    case 'ZodRecord':
      return convertZodRecord(zodSchema as z.ZodRecord<any>, ctx, baseSchema);

    case 'ZodMap':
      return convertZodMap(zodSchema as z.ZodMap<any>, ctx, baseSchema);

    case 'ZodSet':
      return convertZodSet(zodSchema as z.ZodSet<any>, ctx, baseSchema);

    case 'ZodOptional':
      return convertSchema(
        (zodSchema as z.ZodOptional<any>)._def.innerType,
        ctx
      );

    case 'ZodNullable':
      return convertZodNullable(
        zodSchema as z.ZodNullable<any>,
        ctx,
        baseSchema
      );

    case 'ZodDefault':
      return convertZodDefault(zodSchema as z.ZodDefault<any>, ctx, baseSchema);

    case 'ZodEffects':
      return convertZodEffects(zodSchema as z.ZodEffects<any>, ctx, baseSchema);

    case 'ZodLazy':
      return convertZodLazy(zodSchema as z.ZodLazy<any>, ctx, baseSchema);

    case 'ZodPromise':
      return convertSchema((zodSchema as z.ZodPromise<any>)._def.type, ctx);

    case 'ZodBranded':
      return convertSchema(
        (zodSchema as z.ZodBranded<any, any>)._def.type,
        ctx
      );

    case 'ZodCatch':
      return convertSchema((zodSchema as z.ZodCatch<any>)._def.innerType, ctx);

    case 'ZodPipeline':
      return convertSchema(
        (zodSchema as z.ZodPipeline<any, any>)._def.out,
        ctx
      );

    default:
      ctx.warnings.push(`Unsupported Zod type: ${typeName}`);
      return createFallbackSchema(`Unsupported type: ${typeName}`, ctx);
  }
}

/**
 * Convert ZodString to JSON Schema
 */
function convertZodString(
  zodSchema: z.ZodString,
  ctx: ConversionContext,
  baseSchema: JSONSchema
): JSONSchema {
  const schema: JSONSchema = {
    ...baseSchema,
    type: 'string',
  };

  const checks = zodSchema._def.checks || [];
  const refinements: string[] = [];

  for (const check of checks) {
    switch ((check as any).kind) {
      case 'min':
        schema.minLength = (check as any).value;
        break;
      case 'max':
        schema.maxLength = (check as any).value;
        break;
      case 'length':
        schema.minLength = (check as any).value;
        schema.maxLength = (check as any).value;
        break;
      case 'email':
        schema.format = 'email';
        break;
      case 'url':
        schema.format = 'uri';
        break;
      case 'uuid':
        schema.format = 'uuid';
        break;
      case 'regex':
        schema.pattern = (check as any).regex.source;
        break;
      case 'cuid':
      case 'cuid2':
      case 'ulid':
      case 'datetime':
      case 'ip':
        refinements.push(check.kind);
        break;
      case 'startsWith':
        refinements.push(`startsWith:${(check as any).value}`);
        break;
      case 'endsWith':
        refinements.push(`endsWith:${(check as any).value}`);
        break;
      case 'includes':
        refinements.push(`includes:${(check as any).value}`);
        break;
      default:
        refinements.push(`unknown:${check.kind}`);
    }
  }

  if (refinements.length > 0) {
    schema['x-zod'] = {
      ...schema['x-zod'],
      refinements,
    };
  }

  return schema;
}

/**
 * Convert ZodNumber to JSON Schema
 */
function convertZodNumber(
  zodSchema: z.ZodNumber,
  ctx: ConversionContext,
  baseSchema: JSONSchema
): JSONSchema {
  const schema: JSONSchema = {
    ...baseSchema,
    type: zodSchema._def.coerce ? 'number' : 'number',
  };

  const checks = zodSchema._def.checks || [];
  const refinements: string[] = [];

  for (const check of checks) {
    switch ((check as any).kind) {
      case 'min':
        if ((check as any).inclusive) {
          schema.minimum = (check as any).value;
        } else {
          schema.exclusiveMinimum = (check as any).value;
        }
        break;
      case 'max':
        if ((check as any).inclusive) {
          schema.maximum = (check as any).value;
        } else {
          schema.exclusiveMaximum = (check as any).value;
        }
        break;
      case 'int':
        schema.type = 'integer';
        break;
      case 'multipleOf':
        schema.multipleOf = (check as any).value;
        break;
      case 'finite':
        refinements.push(check.kind);
        break;
      case 'safe':
        // Safe numbers are within Number.MIN_SAFE_INTEGER and Number.MAX_SAFE_INTEGER
        schema.minimum = Number.MIN_SAFE_INTEGER;
        schema.maximum = Number.MAX_SAFE_INTEGER;
        refinements.push(check.kind);
        break;
      default:
        refinements.push(`unknown:${check.kind}`);
    }
  }

  if (refinements.length > 0) {
    schema['x-zod'] = {
      ...schema['x-zod'],
      refinements,
    };
  }

  return schema;
}

/**
 * Convert ZodBigInt to JSON Schema
 */
function convertZodBigInt(
  zodSchema: z.ZodBigInt,
  ctx: ConversionContext,
  baseSchema: JSONSchema
): JSONSchema {
  return {
    ...baseSchema,
    type: 'integer',
    'x-zod': {
      ...baseSchema['x-zod'],
      bigint: true,
    },
  };
}

/**
 * Convert ZodBoolean to JSON Schema
 */
function convertZodBoolean(
  zodSchema: z.ZodBoolean,
  ctx: ConversionContext,
  baseSchema: JSONSchema
): JSONSchema {
  return {
    ...baseSchema,
    type: 'boolean',
  };
}

/**
 * Convert ZodDate to JSON Schema
 */
function convertZodDate(
  zodSchema: z.ZodDate,
  ctx: ConversionContext,
  baseSchema: JSONSchema
): JSONSchema {
  return {
    ...baseSchema,
    type: 'string',
    format: 'date-time',
    'x-zod': {
      ...baseSchema['x-zod'],
      date: true,
    },
  };
}

/**
 * Convert ZodLiteral to JSON Schema
 */
function convertZodLiteral(
  zodSchema: z.ZodLiteral<any>,
  ctx: ConversionContext,
  baseSchema: JSONSchema
): JSONSchema {
  const value = zodSchema._def.value;
  return {
    ...baseSchema,
    const: value,
    type: typeof value as any,
  };
}

/**
 * Convert ZodEnum to JSON Schema
 */
function convertZodEnum(
  zodSchema: z.ZodEnum<any>,
  ctx: ConversionContext,
  baseSchema: JSONSchema
): JSONSchema {
  return {
    ...baseSchema,
    type: 'string',
    enum: zodSchema._def.values,
  };
}

/**
 * Convert ZodNativeEnum to JSON Schema
 */
function convertZodNativeEnum(
  zodSchema: z.ZodNativeEnum<any>,
  ctx: ConversionContext,
  baseSchema: JSONSchema
): JSONSchema {
  const enumObject = zodSchema._def.values;
  const values = Object.values(enumObject);

  return {
    ...baseSchema,
    enum: values,
  };
}

/**
 * Convert ZodObject to JSON Schema
 */
function convertZodObject(
  zodSchema: z.ZodObject<any>,
  ctx: ConversionContext,
  baseSchema: JSONSchema
): JSONSchema {
  const shape = zodSchema._def.shape();
  const properties: Record<string, JSONSchema> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    const propertySchema = convertSchema(value as z.ZodTypeAny, ctx);
    properties[key] = propertySchema;

    // Check if the property is required (not optional)
    if (!isOptionalSchema(value as z.ZodTypeAny)) {
      required.push(key);
    }
  }

  const schema: JSONSchema = {
    ...baseSchema,
    type: 'object',
    properties,
  };

  if (required.length > 0) {
    schema.required = required;
  }

  // Handle unknown keys
  const unknownKeys = zodSchema._def.unknownKeys;
  if (unknownKeys === 'passthrough') {
    schema.additionalProperties = true;
  } else if (unknownKeys === 'strict') {
    schema.additionalProperties = false;
  }

  return schema;
}

/**
 * Convert ZodArray to JSON Schema
 */
function convertZodArray(
  zodSchema: z.ZodArray<any>,
  ctx: ConversionContext,
  baseSchema: JSONSchema
): JSONSchema {
  const itemSchema = convertSchema(zodSchema._def.type, ctx);

  const schema: JSONSchema = {
    ...baseSchema,
    type: 'array',
    items: itemSchema,
  };

  // Handle array constraints
  if (zodSchema._def.minLength !== null) {
    schema.minItems = zodSchema._def.minLength.value;
  }

  if (zodSchema._def.maxLength !== null) {
    schema.maxItems = zodSchema._def.maxLength.value;
  }

  if (zodSchema._def.exactLength !== null) {
    schema.minItems = zodSchema._def.exactLength.value;
    schema.maxItems = zodSchema._def.exactLength.value;
  }

  return schema;
}

/**
 * Convert ZodUnion to JSON Schema
 */
function convertZodUnion(
  zodSchema: z.ZodUnion<any>,
  ctx: ConversionContext,
  baseSchema: JSONSchema
): JSONSchema {
  const options = zodSchema._def.options.map((option: z.ZodTypeAny) =>
    convertSchema(option, ctx)
  );

  return {
    ...baseSchema,
    anyOf: options,
  };
}

/**
 * Convert ZodDiscriminatedUnion to JSON Schema
 */
function convertZodDiscriminatedUnion(
  zodSchema: z.ZodDiscriminatedUnion<any, any>,
  ctx: ConversionContext,
  baseSchema: JSONSchema
): JSONSchema {
  const discriminator = zodSchema._def.discriminator;
  const options = Array.from(zodSchema._def.options.values()).map(option =>
    convertSchema(option as z.ZodTypeAny, ctx)
  );

  return {
    ...baseSchema,
    oneOf: options,
    discriminator: {
      propertyName: discriminator,
    },
  };
}

/**
 * Convert ZodIntersection to JSON Schema
 */
function convertZodIntersection(
  zodSchema: z.ZodIntersection<any, any>,
  ctx: ConversionContext,
  baseSchema: JSONSchema
): JSONSchema {
  const left = convertSchema(zodSchema._def.left, ctx);
  const right = convertSchema(zodSchema._def.right, ctx);

  return {
    ...baseSchema,
    allOf: [left, right],
  };
}

/**
 * Convert ZodTuple to JSON Schema
 */
function convertZodTuple(
  zodSchema: z.ZodTuple<any>,
  ctx: ConversionContext,
  baseSchema: JSONSchema
): JSONSchema {
  const items = zodSchema._def.items.map((item: z.ZodTypeAny) =>
    convertSchema(item, ctx)
  );

  const schema: JSONSchema = {
    ...baseSchema,
    type: 'array',
    items: items.length === 1 ? items[0] : { anyOf: items },
    minItems: items.length,
    maxItems: items.length,
  };

  // Handle rest type
  if (zodSchema._def.rest) {
    const restSchema = convertSchema(zodSchema._def.rest, ctx);
    schema.additionalItems = restSchema;
    delete schema.maxItems;
  }

  return schema;
}

/**
 * Convert ZodRecord to JSON Schema
 */
function convertZodRecord(
  zodSchema: z.ZodRecord<any>,
  ctx: ConversionContext,
  baseSchema: JSONSchema
): JSONSchema {
  const valueSchema = convertSchema(zodSchema._def.valueType, ctx);

  return {
    ...baseSchema,
    type: 'object',
    additionalProperties: valueSchema,
  };
}

/**
 * Convert ZodMap to JSON Schema
 */
function convertZodMap(
  zodSchema: z.ZodMap<any>,
  ctx: ConversionContext,
  baseSchema: JSONSchema
): JSONSchema {
  ctx.warnings.push('Map type converted to object with string keys');
  const valueSchema = convertSchema(zodSchema._def.valueType, ctx);

  return {
    ...baseSchema,
    type: 'object',
    additionalProperties: valueSchema,
    'x-zod': {
      ...baseSchema['x-zod'],
      map: true,
    },
  };
}

/**
 * Convert ZodSet to JSON Schema
 */
function convertZodSet(
  zodSchema: z.ZodSet<any>,
  ctx: ConversionContext,
  baseSchema: JSONSchema
): JSONSchema {
  ctx.warnings.push('Set type converted to array with unique items');
  const itemSchema = convertSchema(zodSchema._def.valueType, ctx);

  return {
    ...baseSchema,
    type: 'array',
    items: itemSchema,
    uniqueItems: true,
    'x-zod': {
      ...baseSchema['x-zod'],
      set: true,
    },
  };
}

/**
 * Convert ZodNullable to JSON Schema
 */
function convertZodNullable(
  zodSchema: z.ZodNullable<any>,
  ctx: ConversionContext,
  baseSchema: JSONSchema
): JSONSchema {
  const innerSchema = convertSchema(zodSchema._def.innerType, ctx);

  return {
    ...baseSchema,
    anyOf: [innerSchema, { type: 'null' }],
  };
}

/**
 * Convert ZodDefault to JSON Schema
 */
function convertZodDefault(
  zodSchema: z.ZodDefault<any>,
  ctx: ConversionContext,
  baseSchema: JSONSchema
): JSONSchema {
  const innerSchema = convertSchema(zodSchema._def.innerType, ctx);

  if (ctx.options.includeDefaults) {
    innerSchema.default = zodSchema._def.defaultValue();
  }

  return innerSchema;
}

/**
 * Convert ZodEffects (refinements/transforms) to JSON Schema
 */
function convertZodEffects(
  zodSchema: z.ZodEffects<any>,
  ctx: ConversionContext,
  baseSchema: JSONSchema
): JSONSchema {
  const innerSchema = convertSchema(zodSchema._def.schema, ctx);

  // Add refinement information
  const effect = zodSchema._def.effect;
  const refinements = innerSchema['x-zod']?.refinements || [];

  if (effect.type === 'refinement') {
    refinements.push('custom-refinement');
  } else if (effect.type === 'transform') {
    refinements.push('transform');
  } else if (effect.type === 'preprocess') {
    refinements.push('preprocess');
  }

  if (refinements.length > 0) {
    innerSchema['x-zod'] = {
      ...innerSchema['x-zod'],
      refinements,
    };
  }

  return innerSchema;
}

/**
 * Convert ZodLazy to JSON Schema
 */
function convertZodLazy(
  zodSchema: z.ZodLazy<any>,
  ctx: ConversionContext,
  baseSchema: JSONSchema
): JSONSchema {
  try {
    const lazySchema = zodSchema._def.getter();
    return convertSchema(lazySchema, ctx);
  } catch (error) {
    ctx.warnings.push('Failed to resolve lazy schema');
    return createFallbackSchema('Failed to resolve lazy schema', ctx);
  }
}

/**
 * Check if a Zod schema is optional
 */
function isOptionalSchema(schema: z.ZodTypeAny): boolean {
  const def = schema._def;

  // Check for ZodOptional
  if (def.typeName === 'ZodOptional') {
    return true;
  }

  // Check for ZodDefault (defaults are optional)
  if (def.typeName === 'ZodDefault') {
    return true;
  }

  // Check for nullable unions that include undefined
  if (def.typeName === 'ZodUnion') {
    return def.options.some(
      (option: z.ZodTypeAny) =>
        option._def.typeName === 'ZodUndefined' ||
        option._def.typeName === 'ZodVoid'
    );
  }

  return false;
}
