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
import { useStudioShortcuts, useFocusVisible } from '../hooks';
import { generateId, announceToScreenReader, aria } from '../lib/accessibility';

export interface PlaygroundFormProps {
  schema: JSONSchema;
  onSubmit: (data: unknown) => void;
  defaultValues?: unknown;
  isExecuting?: boolean;
  className?: string;
}

export function PlaygroundForm({
  schema,
  onSubmit,
  defaultValues,
  isExecuting = false,
  className,
}: PlaygroundFormProps) {
  const [isJsonMode, setIsJsonMode] = React.useState(false);
  const [jsonValue, setJsonValue] = React.useState('');

  // Accessibility IDs
  const formId = React.useMemo(() => generateId('playground-form'), []);
  const modeToggleId = React.useMemo(() => generateId('mode-toggle'), []);

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
    const newMode = !isJsonMode;
    setIsJsonMode(newMode);
    announceToScreenReader(
      newMode ? 'Switched to JSON mode' : 'Switched to form mode'
    );
  };

  // Keyboard shortcuts
  useStudioShortcuts({
    onToggleJsonMode: toggleMode,
    onExecuteRequest: () => {
      if (isJsonMode) {
        handleJsonSubmit();
      } else {
        form.handleSubmit(handleFormSubmit)();
      }
    },
  });

  React.useEffect(() => {
    if (defaultValues) {
      setJsonValue(JSON.stringify(defaultValues, null, 2));
    }
  }, [defaultValues]);

  return (
    <section
      className={cn('space-y-4', className)}
      aria-labelledby={`${formId}-title`}
    >
      {/* Mode Toggle */}
      <div className="flex items-center justify-between">
        <h3 id={`${formId}-title`} className="text-lg font-semibold">
          Input Parameters
        </h3>
        <Toggle
          pressed={isJsonMode}
          onPressedChange={toggleMode}
          className="data-[state=on]:bg-accent"
          title={`Switch to ${isJsonMode ? 'form' : 'JSON'} mode (Ctrl+J)`}
        >
          {isJsonMode ? (
            <>
              <FormInput className="h-4 w-4 mr-2" aria-hidden="true" />
              Form Mode
            </>
          ) : (
            <>
              <Code className="h-4 w-4 mr-2" aria-hidden="true" />
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
          isExecuting={isExecuting}
          formId={formId}
        />
      ) : (
        <form
          id={formId}
          onSubmit={form.handleSubmit(handleFormSubmit)}
          className="space-y-4"
          aria-label="Procedure input form"
        >
          <FormField
            name=""
            schema={schema}
            control={form.control}
            register={form.register}
            errors={form.formState.errors}
            formId={formId}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={isExecuting}
            aria-describedby={`${formId}-submit-help`}
          >
            {isExecuting ? (
              <>
                <div
                  className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"
                  aria-hidden="true"
                />
                Executing...
              </>
            ) : (
              'Execute Request (Ctrl+Enter)'
            )}
          </Button>
          <div id={`${formId}-submit-help`} className="sr-only">
            Submit the form to execute the tRPC procedure. Use Ctrl+Enter
            keyboard shortcut.
          </div>
        </form>
      )}
    </section>
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
  formId?: string;
}

function FormField({
  name,
  schema,
  control,
  register,
  errors,
  level = 0,
  formId = '',
}: FormFieldProps) {
  // Handle x-zod.unmapped fallback
  if (schema['x-zod']?.unmapped) {
    return (
      <UnmappedField
        name={name}
        schema={schema}
        control={control}
        errors={errors}
        formId={formId}
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
        formId={formId}
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
        formId={formId}
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
          formId={formId}
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
          formId={formId}
        />
      );
    case 'boolean':
      return (
        <BooleanField
          name={name}
          schema={schema}
          control={control}
          errors={errors}
          formId={formId}
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
          formId={formId}
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
          formId={formId}
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
          formId={formId}
        />
      );
  }
}

// String input field
function StringField({ name, schema, register, errors, formId = '' }: any) {
  const fieldName = name || 'root';
  const fieldId = `${formId}-${fieldName}`.replace(/\./g, '-');
  const error = getNestedError(errors, fieldName);
  const isRequired = schema.required?.includes(fieldName.split('.').pop());

  return (
    <div className="space-y-2">
      <label htmlFor={fieldId} className="text-sm font-medium">
        {schema.title || fieldName}
        {isRequired && (
          <span className="text-destructive ml-1" aria-label="required">
            *
          </span>
        )}
        {schema.description && (
          <span className="text-muted-foreground ml-1">
            ({schema.description})
          </span>
        )}
      </label>
      <Input
        id={fieldId}
        type={getInputType(schema)}
        placeholder={
          (schema.examples?.[0] as string) || (schema.default as string)
        }
        {...register(fieldName)}
        className={error ? 'border-destructive' : ''}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        aria-required={isRequired}
      />
      {error && (
        <p
          id={`${fieldId}-error`}
          className="text-sm text-destructive"
          role="alert"
        >
          {error.message}
        </p>
      )}
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
  isExecuting?: boolean;
  formId?: string;
}

function JsonModeEditor({
  value,
  onChange,
  onSubmit,
  schema,
  compact = false,
  isExecuting = false,
  formId = '',
}: JsonModeEditorProps) {
  const [error, setError] = React.useState<string | null>(null);
  const textareaId = `${formId}-json-editor`;

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
      <label htmlFor={textareaId} className="text-sm font-medium">
        JSON Input
      </label>
      <div className="relative">
        <textarea
          id={textareaId}
          value={value}
          onChange={handleChange}
          className={cn(
            'w-full font-mono text-sm border border-input rounded-md p-3 bg-background',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            error ? 'border-destructive' : '',
            compact ? 'min-h-[100px]' : 'min-h-[200px]'
          )}
          placeholder="Enter JSON..."
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${textareaId}-error` : `${textareaId}-help`
          }
        />
      </div>

      <div id={`${textareaId}-help`} className="sr-only">
        Enter valid JSON for the procedure input. Use Ctrl+Enter to execute.
      </div>

      {error && (
        <p
          id={`${textareaId}-error`}
          className="text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}

      {onSubmit && (
        <Button
          onClick={onSubmit}
          disabled={!!error || isExecuting}
          className="w-full"
          aria-describedby={`${formId}-submit-help`}
        >
          {isExecuting ? (
            <>
              <div
                className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"
                aria-hidden="true"
              />
              Executing...
            </>
          ) : (
            'Execute Request (Ctrl+Enter)'
          )}
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
