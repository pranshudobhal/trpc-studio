import * as React from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { JSONSchema } from '@trpc-studio/core';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Toggle } from './ui/toggle';
import { JsonViewer } from './json-viewer';
import { Plus, Minus, Code, FormInput } from 'lucide-react';
import { cn } from '../lib/utils';

export interface PlaygroundFormProps {
  schema: JSONSchema;
  onSubmit: (data: unknown) => void;
  defaultValues?: unknown;
  className?: string;
}

export function PlaygroundForm({
  schema,
  onSubmit,
  defaultValues,
  className,
}: PlaygroundFormProps) {
  const [isJsonMode, setIsJsonMode] = React.useState(false);
  const [jsonValue, setJsonValue] = React.useState('');

  // Convert JSON Schema to Zod schema for validation
  const zodSchema = React.useMemo(() => {
    return jsonSchemaToZod(schema);
  }, [schema]);

  const form = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues: defaultValues || getDefaultValues(schema),
  });

  const handleFormSubmit = (data: unknown) => {
    onSubmit(data);
  };

  const handleJsonSubmit = () => {
    try {
      const parsedData = JSON.parse(jsonValue);
      const validatedData = zodSchema.parse(parsedData);
      onSubmit(validatedData);
    } catch (error) {
      // Handle validation error
      console.error('JSON validation error:', error);
    }
  };

  const toggleMode = () => {
    if (!isJsonMode) {
      // Switching to JSON mode - populate with current form values
      const currentValues = form.getValues();
      setJsonValue(JSON.stringify(currentValues, null, 2));
    }
    setIsJsonMode(!isJsonMode);
  };

  React.useEffect(() => {
    if (defaultValues) {
      setJsonValue(JSON.stringify(defaultValues, null, 2));
    }
  }, [defaultValues]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Mode Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Input Parameters</h3>
        <Toggle
          pressed={isJsonMode}
          onPressedChange={toggleMode}
          aria-label="Toggle JSON mode"
          className="data-[state=on]:bg-accent"
        >
          {isJsonMode ? (
            <>
              <FormInput className="h-4 w-4 mr-2" />
              Form Mode
            </>
          ) : (
            <>
              <Code className="h-4 w-4 mr-2" />
              JSON Mode
            </>
          )}
        </Toggle>
      </div>

      {isJsonMode ? (
        <JsonModeEditor
          value={jsonValue}
          onChange={setJsonValue}
          onSubmit={handleJsonSubmit}
          schema={schema}
        />
      ) : (
        <form
          onSubmit={form.handleSubmit(handleFormSubmit)}
          className="space-y-4"
        >
          <FormField
            name=""
            schema={schema}
            control={form.control}
            register={form.register}
            errors={form.formState.errors}
          />
          <Button type="submit" className="w-full">
            Execute Request
          </Button>
        </form>
      )}
    </div>
  );
}

// Form field component that handles different schema types
interface FormFieldProps {
  name: string;
  schema: JSONSchema;
  control: any;
  register: any;
  errors: any;
  level?: number;
}

function FormField({
  name,
  schema,
  control,
  register,
  errors,
  level = 0,
}: FormFieldProps) {
  // Handle x-zod.unmapped fallback
  if (schema['x-zod']?.unmapped) {
    return (
      <UnmappedField
        name={name}
        schema={schema}
        control={control}
        errors={errors}
      />
    );
  }

  // Handle enum first (before checking type)
  if (schema.enum) {
    return (
      <EnumField
        name={name}
        schema={schema}
        control={control}
        errors={errors}
      />
    );
  }

  // Handle union types (anyOf, oneOf)
  if (schema.anyOf || schema.oneOf) {
    return (
      <UnionField
        name={name}
        schema={schema}
        control={control}
        register={register}
        errors={errors}
        level={level}
      />
    );
  }

  // Handle different schema types
  switch (schema.type) {
    case 'string':
      return (
        <StringField
          name={name}
          schema={schema}
          register={register}
          errors={errors}
        />
      );
    case 'number':
    case 'integer':
      return (
        <NumberField
          name={name}
          schema={schema}
          register={register}
          errors={errors}
        />
      );
    case 'boolean':
      return (
        <BooleanField
          name={name}
          schema={schema}
          control={control}
          errors={errors}
        />
      );
    case 'object':
      return (
        <ObjectField
          name={name}
          schema={schema}
          control={control}
          register={register}
          errors={errors}
          level={level}
        />
      );
    case 'array':
      return (
        <ArrayField
          name={name}
          schema={schema}
          control={control}
          register={register}
          errors={errors}
          level={level}
        />
      );
    default:
      // Fallback to unmapped field
      return (
        <UnmappedField
          name={name}
          schema={schema}
          control={control}
          errors={errors}
        />
      );
  }
}

// String input field
function StringField({ name, schema, register, errors }: any) {
  const fieldName = name || 'root';
  const error = getNestedError(errors, fieldName);

  return (
    <div className="space-y-2">
      <label htmlFor={fieldName} className="text-sm font-medium">
        {schema.title || fieldName}
        {schema.description && (
          <span className="text-muted-foreground ml-1">
            ({schema.description})
          </span>
        )}
      </label>
      <Input
        id={fieldName}
        type={getInputType(schema)}
        placeholder={
          (schema.examples?.[0] as string) || (schema.default as string)
        }
        {...register(fieldName)}
        className={error ? 'border-destructive' : ''}
      />
      {error && <p className="text-sm text-destructive">{error.message}</p>}
    </div>
  );
}

// Number input field
function NumberField({ name, schema, register, errors }: any) {
  const fieldName = name || 'root';
  const error = getNestedError(errors, fieldName);

  return (
    <div className="space-y-2">
      <label htmlFor={fieldName} className="text-sm font-medium">
        {schema.title || fieldName}
        {schema.description && (
          <span className="text-muted-foreground ml-1">
            ({schema.description})
          </span>
        )}
      </label>
      <Input
        id={fieldName}
        type="number"
        step={schema.type === 'integer' ? '1' : 'any'}
        min={schema.minimum}
        max={schema.maximum}
        placeholder={
          (schema.examples?.[0] as string) || (schema.default as string)
        }
        {...register(fieldName, { valueAsNumber: true })}
        className={error ? 'border-destructive' : ''}
      />
      {error && <p className="text-sm text-destructive">{error.message}</p>}
    </div>
  );
}

// Boolean checkbox field
function BooleanField({ name, schema, control, errors }: any) {
  const fieldName = name || 'root';
  const error = getNestedError(errors, fieldName);

  return (
    <div className="space-y-2">
      <Controller
        name={fieldName}
        control={control}
        render={({ field }) => (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={fieldName}
              checked={field.value || false}
              onChange={e => field.onChange(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <label htmlFor={fieldName} className="text-sm font-medium">
              {schema.title || fieldName}
              {schema.description && (
                <span className="text-muted-foreground ml-1">
                  ({schema.description})
                </span>
              )}
            </label>
          </div>
        )}
      />
      {error && <p className="text-sm text-destructive">{error.message}</p>}
    </div>
  );
}
// Object field with nested properties
function ObjectField({ name, schema, control, register, errors, level }: any) {
  const fieldName = name || 'root';
  const properties = schema.properties || {};
  const required = schema.required || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <h4 className="text-sm font-medium">{schema.title || fieldName}</h4>
        {schema.description && (
          <span className="text-xs text-muted-foreground">
            ({schema.description})
          </span>
        )}
      </div>
      <div
        className={cn(
          'space-y-3 pl-4 border-l-2 border-muted',
          level > 0 && 'ml-2'
        )}
      >
        {Object.entries(properties).map(([propName, propSchema]) => {
          const fullName = fieldName ? `${fieldName}.${propName}` : propName;
          const isRequired = required.includes(propName);

          return (
            <div key={propName} className="space-y-1">
              <div className="flex items-center space-x-1">
                <span className="text-xs text-muted-foreground">
                  {propName}
                  {isRequired && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </span>
              </div>
              <FormField
                name={fullName}
                schema={propSchema as JSONSchema}
                control={control}
                register={register}
                errors={errors}
                level={level + 1}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Array field with add/remove functionality
function ArrayField({ name, schema, control, register, errors, level }: any) {
  const fieldName = name || 'root';
  const { fields, append, remove } = useFieldArray({
    control,
    name: fieldName,
  });

  const itemSchema = schema.items as JSONSchema;
  const error = getNestedError(errors, fieldName);

  const addItem = () => {
    const defaultValue = getDefaultValues(itemSchema);
    append(defaultValue);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h4 className="text-sm font-medium">{schema.title || fieldName}</h4>
          {schema.description && (
            <span className="text-xs text-muted-foreground">
              ({schema.description})
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          className="h-8"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Item
        </Button>
      </div>

      {fields.length === 0 && (
        <div className="text-sm text-muted-foreground italic">
          No items. Click "Add Item" to add one.
        </div>
      )}

      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-start space-x-2">
            <div className="flex-1">
              <FormField
                name={`${fieldName}.${index}`}
                schema={itemSchema}
                control={control}
                register={register}
                errors={errors}
                level={level + 1}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => remove(index)}
              className="h-8 w-8 p-0 mt-6"
              aria-label="Remove item"
            >
              <Minus className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error.message}</p>}
    </div>
  );
}

// Union type field with type selection
function UnionField({ name, schema, control, register, errors, level }: any) {
  const fieldName = name || 'root';
  const [selectedType, setSelectedType] = React.useState(0);

  const unionSchemas = schema.oneOf || schema.anyOf || [];
  const error = getNestedError(errors, fieldName);

  const handleTypeChange = (typeIndex: string) => {
    const index = parseInt(typeIndex);
    setSelectedType(index);
    // Reset the field value when type changes
    // This would need to be implemented with form.setValue
  };

  if (unionSchemas.length === 0) {
    return (
      <UnmappedField
        name={name}
        schema={schema}
        control={control}
        errors={errors}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <h4 className="text-sm font-medium">{schema.title || fieldName}</h4>
        {schema.description && (
          <span className="text-xs text-muted-foreground">
            ({schema.description})
          </span>
        )}
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Type
          </label>
          <Select
            value={selectedType.toString()}
            onValueChange={handleTypeChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {unionSchemas.map((unionSchema: JSONSchema, index: number) => (
                <SelectItem key={index} value={index.toString()}>
                  {getSchemaTypeLabel(unionSchema)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <FormField
          name={fieldName}
          schema={unionSchemas[selectedType]}
          control={control}
          register={register}
          errors={errors}
          level={level + 1}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error.message}</p>}
    </div>
  );
}

// Enum/select field
function EnumField({ name, schema, control, errors }: any) {
  const fieldName = name || 'root';
  const error = getNestedError(errors, fieldName);
  const enumValues = schema.enum || [];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {schema.title || fieldName}
        {schema.description && (
          <span className="text-muted-foreground ml-1">
            ({schema.description})
          </span>
        )}
      </label>
      <Controller
        name={fieldName}
        control={control}
        render={({ field }) => (
          <Select
            value={field.value?.toString()}
            onValueChange={field.onChange}
          >
            <SelectTrigger className={error ? 'border-destructive' : ''}>
              <SelectValue placeholder="Select an option..." />
            </SelectTrigger>
            <SelectContent>
              {enumValues.map((value: any, index: number) => (
                <SelectItem key={index} value={value.toString()}>
                  {value.toString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {error && <p className="text-sm text-destructive">{error.message}</p>}
    </div>
  );
}

// Fallback field for unmapped schemas
function UnmappedField({ name, schema, control, errors }: any) {
  const fieldName = name || 'root';
  const error = getNestedError(errors, fieldName);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {schema.title || fieldName}
        {schema.description && (
          <span className="text-muted-foreground ml-1">
            ({schema.description})
          </span>
        )}
        <span className="text-xs text-orange-600 ml-2">(JSON Editor)</span>
      </label>
      <Controller
        name={fieldName}
        control={control}
        render={({ field }) => (
          <JsonModeEditor
            value={
              typeof field.value === 'string'
                ? field.value
                : JSON.stringify(field.value || {}, null, 2)
            }
            onChange={value => {
              try {
                const parsed = JSON.parse(value);
                field.onChange(parsed);
              } catch {
                field.onChange(value);
              }
            }}
            schema={schema}
            compact
          />
        )}
      />
      {error && <p className="text-sm text-destructive">{error.message}</p>}
    </div>
  );
}
// JSON Mode Editor component
interface JsonModeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  schema?: JSONSchema;
  compact?: boolean;
}

function JsonModeEditor({
  value,
  onChange,
  onSubmit,
  schema,
  compact = false,
}: JsonModeEditorProps) {
  const [error, setError] = React.useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Validate JSON syntax
    try {
      JSON.parse(newValue);
      setError(null);
    } catch (err) {
      setError('Invalid JSON syntax');
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <textarea
          value={value}
          onChange={handleChange}
          className={cn(
            'w-full font-mono text-sm border border-input rounded-md p-3 bg-background',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            error ? 'border-destructive' : '',
            compact ? 'min-h-[100px]' : 'min-h-[200px]'
          )}
          placeholder="Enter JSON..."
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {onSubmit && (
        <Button onClick={onSubmit} disabled={!!error} className="w-full">
          Execute Request
        </Button>
      )}
    </div>
  );
}

// Utility functions
function getInputType(schema: JSONSchema): string {
  if (schema.format === 'email') return 'email';
  if (schema.format === 'uri') return 'url';
  if (schema.format === 'date') return 'date';
  if (schema.format === 'date-time') return 'datetime-local';
  return 'text';
}

function getNestedError(errors: any, path: string): any {
  if (!path || !errors) return null;

  const keys = path.split('.');
  let current = errors;

  for (const key of keys) {
    if (current?.[key]) {
      current = current[key];
    } else {
      return null;
    }
  }

  return current;
}

function getSchemaTypeLabel(schema: JSONSchema): string {
  if (schema.title) return schema.title;
  if (schema.type) return schema.type;
  if (schema.enum) return 'enum';
  if (schema.anyOf) return 'union';
  if (schema.oneOf) return 'oneOf';
  return 'unknown';
}

function getDefaultValues(schema: JSONSchema): any {
  if (schema.default !== undefined) {
    return schema.default;
  }

  switch (schema.type) {
    case 'string':
      return '';
    case 'number':
    case 'integer':
      return 0;
    case 'boolean':
      return false;
    case 'array':
      return [];
    case 'object':
      const obj: any = {};
      if (schema.properties) {
        Object.entries(schema.properties).forEach(([key, propSchema]) => {
          obj[key] = getDefaultValues(propSchema as JSONSchema);
        });
      }
      return obj;
    default:
      return null;
  }
}

// Convert JSON Schema to Zod schema for validation
function jsonSchemaToZod(schema: JSONSchema): z.ZodSchema {
  // This is a simplified conversion - in a real implementation,
  // this would be more comprehensive and handle all edge cases

  if (schema['x-zod']?.unmapped) {
    // For unmapped schemas, use a permissive schema
    return z.any();
  }

  switch (schema.type) {
    case 'string':
      let stringSchema = z.string();
      if (schema.minLength) stringSchema = stringSchema.min(schema.minLength);
      if (schema.maxLength) stringSchema = stringSchema.max(schema.maxLength);
      if (schema.pattern)
        stringSchema = stringSchema.regex(new RegExp(schema.pattern));
      if (schema.format === 'email') stringSchema = stringSchema.email();
      return stringSchema;

    case 'number':
      let numberSchema = z.number();
      if (schema.minimum) numberSchema = numberSchema.min(schema.minimum);
      if (schema.maximum) numberSchema = numberSchema.max(schema.maximum);
      return numberSchema;

    case 'integer':
      let intSchema = z.number().int();
      if (schema.minimum) intSchema = intSchema.min(schema.minimum);
      if (schema.maximum) intSchema = intSchema.max(schema.maximum);
      return intSchema;

    case 'boolean':
      return z.boolean();

    case 'array':
      const itemSchema = schema.items ? jsonSchemaToZod(schema.items) : z.any();
      let arraySchema = z.array(itemSchema);
      if (schema.minItems) arraySchema = arraySchema.min(schema.minItems);
      if (schema.maxItems) arraySchema = arraySchema.max(schema.maxItems);
      return arraySchema;

    case 'object':
      const shape: Record<string, z.ZodSchema> = {};
      if (schema.properties) {
        Object.entries(schema.properties).forEach(([key, propSchema]) => {
          shape[key] = jsonSchemaToZod(propSchema as JSONSchema);
        });
      }
      return z.object(shape);

    default:
      if (schema.enum) {
        return z.enum(schema.enum as [string, ...string[]]);
      }
      if (schema.anyOf) {
        const schemas = schema.anyOf.map(s => jsonSchemaToZod(s));
        return z.union(schemas as [z.ZodSchema, z.ZodSchema, ...z.ZodSchema[]]);
      }
      if (schema.oneOf) {
        const schemas = schema.oneOf.map(s => jsonSchemaToZod(s));
        return z.union(schemas as [z.ZodSchema, z.ZodSchema, ...z.ZodSchema[]]);
      }
      return z.any();
  }
}
