import * as React from 'react';
import { JSONSchema } from '@trpc-studio/core';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ChevronRight, ChevronDown, Copy } from 'lucide-react';
import { cn } from '../lib/utils';

export interface SchemaDisplayProps {
  schema: JSONSchema;
  className?: string;
  level?: number;
}

export function SchemaDisplay({
  schema,
  className,
  level = 0,
}: SchemaDisplayProps) {
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  const toggleExpanded = (path: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <SchemaNode
        schema={schema}
        path=""
        level={level}
        expanded={expanded}
        onToggleExpanded={toggleExpanded}
        onCopy={copyToClipboard}
      />
    </div>
  );
}

interface SchemaNodeProps {
  schema: JSONSchema;
  path: string;
  level: number;
  expanded: Set<string>;
  onToggleExpanded: (path: string) => void;
  onCopy: (text: string) => void;
  propertyName?: string;
  isRequired?: boolean;
}

function SchemaNode({
  schema,
  path,
  level,
  expanded,
  onToggleExpanded,
  onCopy,
  propertyName,
  isRequired = false,
}: SchemaNodeProps) {
  const isExpanded = expanded.has(path);
  const hasChildren =
    (schema.type === 'object' && schema.properties) ||
    (schema.type === 'array' && schema.items) ||
    schema.anyOf ||
    schema.oneOf ||
    schema.allOf;

  const indent = level * 16;

  // Handle unmapped Zod schemas
  if (schema['x-zod']?.unmapped) {
    return (
      <div
        style={{ marginLeft: indent }}
        className="border border-dashed border-muted-foreground/50 rounded p-3"
      >
        <div className="flex items-center gap-2 mb-2">
          {propertyName && (
            <span className="font-mono text-sm font-medium">
              {propertyName}
            </span>
          )}
          <Badge variant="outline" className="text-xs">
            Complex Schema
          </Badge>
          {isRequired && (
            <Badge variant="destructive" className="text-xs">
              Required
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          This schema contains complex Zod refinements that couldn't be
          converted to JSON Schema. Use the JSON editor in the playground for
          this field.
        </p>
        {schema['x-zod']?.refinements && (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground">Refinements:</p>
            <ul className="text-xs text-muted-foreground list-disc list-inside">
              {schema['x-zod'].refinements.map((refinement, i) => (
                <li key={i}>{refinement}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginLeft: indent }}>
      {/* Property Header */}
      <div className="flex items-center gap-2 py-1">
        {hasChildren && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleExpanded(path)}
            className="h-6 w-6 p-0 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        )}

        {propertyName && (
          <span className="font-mono text-sm font-medium">{propertyName}</span>
        )}

        <TypeBadge schema={schema} />

        {isRequired && (
          <Badge variant="destructive" className="text-xs">
            Required
          </Badge>
        )}

        {schema.default !== undefined && (
          <Badge variant="outline" className="text-xs">
            Default: {JSON.stringify(schema.default)}
          </Badge>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onCopy(JSON.stringify(schema, null, 2))}
          className="h-6 w-6 p-0 ml-auto hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          title="Copy schema"
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>

      {/* Description */}
      {schema.description && (
        <p className="text-sm text-muted-foreground mb-2 ml-8">
          {schema.description}
        </p>
      )}

      {/* Constraints */}
      <SchemaConstraints schema={schema} />

      {/* Examples */}
      {schema.examples && schema.examples.length > 0 && (
        <div className="ml-8 mb-2">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Examples:
          </p>
          <div className="space-y-1">
            {schema.examples.map((example, i) => (
              <code
                key={i}
                className="text-xs bg-muted px-2 py-1 rounded block"
              >
                {JSON.stringify(example)}
              </code>
            ))}
          </div>
        </div>
      )}

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="mt-2">
          {/* Object Properties */}
          {schema.type === 'object' && schema.properties && (
            <div className="space-y-1">
              {Object.entries(schema.properties).map(
                ([propName, propSchema]) => (
                  <SchemaNode
                    key={propName}
                    schema={propSchema}
                    path={`${path}.${propName}`}
                    level={level + 1}
                    expanded={expanded}
                    onToggleExpanded={onToggleExpanded}
                    onCopy={onCopy}
                    propertyName={propName}
                    isRequired={schema.required?.includes(propName)}
                  />
                )
              )}
            </div>
          )}

          {/* Array Items */}
          {schema.type === 'array' && schema.items && (
            <SchemaNode
              schema={schema.items}
              path={`${path}[]`}
              level={level + 1}
              expanded={expanded}
              onToggleExpanded={onToggleExpanded}
              onCopy={onCopy}
              propertyName="items"
            />
          )}

          {/* Union Types */}
          {(schema.anyOf || schema.oneOf) && (
            <div className="space-y-1">
              {(schema.anyOf || schema.oneOf)?.map((unionSchema, i) => (
                <SchemaNode
                  key={i}
                  schema={unionSchema}
                  path={`${path}.union[${i}]`}
                  level={level + 1}
                  expanded={expanded}
                  onToggleExpanded={onToggleExpanded}
                  onCopy={onCopy}
                  propertyName={`Option ${i + 1}`}
                />
              ))}
            </div>
          )}

          {/* Intersection Types */}
          {schema.allOf && (
            <div className="space-y-1">
              {schema.allOf.map((intersectionSchema, i) => (
                <SchemaNode
                  key={i}
                  schema={intersectionSchema}
                  path={`${path}.intersection[${i}]`}
                  level={level + 1}
                  expanded={expanded}
                  onToggleExpanded={onToggleExpanded}
                  onCopy={onCopy}
                  propertyName={`Schema ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TypeBadge({ schema }: { schema: JSONSchema }) {
  let type: string = schema.type || 'unknown';
  let variant: 'default' | 'secondary' | 'outline' = 'secondary';

  if (schema.enum) {
    type = 'enum';
    variant = 'outline';
  } else if (schema.const !== undefined) {
    type = 'const';
    variant = 'outline';
  } else if (schema.anyOf) {
    type = 'union';
    variant = 'default';
  } else if (schema.oneOf) {
    type = 'discriminated union';
    variant = 'default';
  } else if (schema.allOf) {
    type = 'intersection';
    variant = 'default';
  }

  return (
    <Badge variant={variant} className="text-xs">
      {type}
    </Badge>
  );
}

function SchemaConstraints({ schema }: { schema: JSONSchema }) {
  const constraints: string[] = [];

  // String constraints
  if (schema.minLength !== undefined)
    constraints.push(`min length: ${schema.minLength}`);
  if (schema.maxLength !== undefined)
    constraints.push(`max length: ${schema.maxLength}`);
  if (schema.pattern) constraints.push(`pattern: ${schema.pattern}`);
  if (schema.format) constraints.push(`format: ${schema.format}`);

  // Number constraints
  if (schema.minimum !== undefined) constraints.push(`min: ${schema.minimum}`);
  if (schema.maximum !== undefined) constraints.push(`max: ${schema.maximum}`);
  if (schema.exclusiveMinimum !== undefined)
    constraints.push(`> ${schema.exclusiveMinimum}`);
  if (schema.exclusiveMaximum !== undefined)
    constraints.push(`< ${schema.exclusiveMaximum}`);
  if (schema.multipleOf !== undefined)
    constraints.push(`multiple of: ${schema.multipleOf}`);

  // Array constraints
  if (schema.minItems !== undefined)
    constraints.push(`min items: ${schema.minItems}`);
  if (schema.maxItems !== undefined)
    constraints.push(`max items: ${schema.maxItems}`);
  if (schema.uniqueItems) constraints.push('unique items');

  // Enum values
  if (schema.enum) {
    constraints.push(
      `values: ${schema.enum.map(v => JSON.stringify(v)).join(', ')}`
    );
  }

  if (constraints.length === 0) return null;

  return (
    <div className="ml-8 mb-2">
      <div className="flex flex-wrap gap-1">
        {constraints.map((constraint, i) => (
          <Badge key={i} variant="outline" className="text-xs">
            {constraint}
          </Badge>
        ))}
      </div>
    </div>
  );
}
