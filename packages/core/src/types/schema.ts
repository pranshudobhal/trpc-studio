// Schema-related type definitions
export interface JSONSchema {
  type?: string;
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  anyOf?: JSONSchema[];
  oneOf?: JSONSchema[];
  enum?: unknown[];
  default?: unknown;
  required?: string[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  format?: string;
  pattern?: string;
  'x-zod'?: {
    unmapped?: boolean;
    [key: string]: unknown;
  };
}
