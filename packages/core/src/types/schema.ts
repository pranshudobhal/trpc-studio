// Schema-related type definitions

/**
 * JSON Schema representation for tRPC procedure inputs/outputs
 * Supports conversion from Zod schemas with fallback handling
 */
export interface JSONSchema {
  // Core JSON Schema properties
  type?:
    | 'string'
    | 'number'
    | 'integer'
    | 'boolean'
    | 'object'
    | 'array'
    | 'null';

  // Object schema properties
  properties?: Record<string, JSONSchema>;
  required?: string[];
  additionalProperties?: boolean | JSONSchema;

  // Array schema properties
  items?: JSONSchema;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  additionalItems?: JSONSchema;

  // Union/intersection properties
  anyOf?: JSONSchema[];
  oneOf?: JSONSchema[];
  allOf?: JSONSchema[];

  // Discriminator for oneOf
  discriminator?: {
    propertyName: string;
  };

  // Enum and const values
  enum?: unknown[];
  const?: unknown;

  // String constraints
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: 'email' | 'uri' | 'date' | 'date-time' | 'uuid' | string;

  // Number constraints
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;

  // Common properties
  default?: unknown;
  title?: string;
  description?: string;
  examples?: unknown[];

  // Zod-specific extensions for fallback handling
  'x-zod'?: {
    unmapped?: boolean; // Indicates conversion failed for this node/subtree
    refinements?: string[]; // Non-standard refinements that couldn't be mapped
    [key: string]: unknown;
  };
}

/**
 * Utility type for schema conversion results
 */
export interface SchemaConversionResult {
  schema: JSONSchema;
  hasUnmappedNodes: boolean;
  warnings: string[];
}
