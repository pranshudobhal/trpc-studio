# Performance Optimization Guide

This guide covers performance optimization strategies for tRPC Studio, including bundle size
management, runtime performance, and best practices for large-scale applications.

## Bundle Size Optimization

### Target Metrics

tRPC Studio is designed to be lightweight:

- **Initial bundle**: ≤300KB gzipped
- **Code splitting**: Heavy dependencies lazy-loaded
- **Tree shaking**: Unused code eliminated

### Bundle Analysis

Check your bundle size:

```bash
# Analyze bundle size
pnpm run size

# Detailed analysis with webpack-bundle-analyzer
npx webpack-bundle-analyzer .next/static/chunks/*.js
```

### Optimization Strategies

#### 1. Code Splitting

Heavy dependencies are automatically code-split:

```typescript
// Monaco editor (v1.1) - lazy loaded
const MonacoEditor = lazy(() => import('./monaco-editor'));

// JSON viewer - lightweight alternative used
import { JsonViewer } from 'react-json-view-lite'; // ~15KB vs ~200KB
```

#### 2. Tree Shaking

Ensure proper imports to enable tree shaking:

```typescript
// ✅ Good - specific imports
import { StudioApp } from '@trpc-studio/ui';
import { createStudioHandler } from '@trpc-studio/next';

// ❌ Avoid - imports entire package
import * as TrpcStudio from '@trpc-studio/ui';
```

#### 3. Dependency Management

Keep dependencies minimal:

```json
{
  "dependencies": {
    "@radix-ui/react-tabs": "^1.0.0",
    "@radix-ui/react-dialog": "^1.0.0",
    "react-hook-form": "^7.0.0",
    "clsx": "^2.0.0"
  },
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18"
  }
}
```

#### 4. CSS Optimization

No runtime CSS-in-JS for better performance:

```typescript
// ✅ Tailwind CSS with build-time processing
import '@trpc-studio/ui/styles';

// ❌ Avoid runtime CSS-in-JS
import styled from 'styled-components'; // Not used
```

## Runtime Performance

### Large Router Trees

For applications with many procedures (100+):

#### 1. Virtual Scrolling

Large procedure lists use virtual scrolling:

```typescript
// Automatically enabled for lists > 50 items
<VirtualizedRouterTree
  items={procedures}
  itemHeight={40}
  containerHeight={600}
/>
```

#### 2. Search and Filtering

Implement efficient search:

```typescript
// Debounced search (300ms delay)
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 300);

// Memoized filtering
const filteredProcedures = useMemo(() => {
  return procedures.filter(proc => proc.name.toLowerCase().includes(debouncedSearch.toLowerCase()));
}, [procedures, debouncedSearch]);
```

#### 3. Lazy Loading

Load procedure details on demand:

```typescript
// Load schema details when procedure is selected
const ProcedureDetails = lazy(() => import('./procedure-details'));

function ProcedureView({ procedureId }) {
  return (
    <Suspense fallback={<Skeleton />}>
      <ProcedureDetails id={procedureId} />
    </Suspense>
  );
}
```

### Schema Rendering

#### 1. Memoization

Expensive schema rendering is memoized:

```typescript
const SchemaDisplay = memo(({ schema }) => {
  const renderedSchema = useMemo(() => {
    return convertZodToJsonSchema(schema);
  }, [schema]);

  return <JsonSchemaRenderer schema={renderedSchema} />;
});
```

#### 2. Progressive Disclosure

Show schema details progressively:

```typescript
// Collapsed by default, expand on click
<Collapsible>
  <CollapsibleTrigger>
    Input Schema ({inputFields.length} fields)
  </CollapsibleTrigger>
  <CollapsibleContent>
    <SchemaDisplay schema={inputSchema} />
  </CollapsibleContent>
</Collapsible>
```

### Form Performance

#### 1. Field-Level Validation

Validate individual fields instead of entire form:

```typescript
// React Hook Form with field-level validation
const { register, formState: { errors } } = useForm({
  mode: 'onChange', // Validate on change
  reValidateMode: 'onChange',
});

<input
  {...register('email', {
    required: 'Email is required',
    pattern: {
      value: /^\S+@\S+$/i,
      message: 'Invalid email format'
    }
  })}
/>
```

#### 2. Debounced Validation

Debounce expensive validations:

```typescript
const debouncedValidation = useCallback(
  debounce(async value => {
    // Expensive validation logic
    const isValid = await validateAsync(value);
    setValidationResult(isValid);
  }, 500),
  []
);
```

## Server-Side Performance

### Introspection Optimization

#### 1. Caching

Cache introspection results:

```typescript
let cachedIntrospection: RouterIntrospection | null = null;

export const GET = createStudioHandler({
  router: appRouter,
  getIntrospection: () => {
    if (!cachedIntrospection) {
      cachedIntrospection = buildIntrospection(appRouter);
    }
    return cachedIntrospection;
  },
});
```

#### 2. Selective Introspection

Only introspect visible procedures:

```typescript
function buildIntrospection(router: AnyRouter) {
  return walkRouter(router, {
    filter: procedure => {
      // Skip hidden procedures during introspection
      return procedure.meta?.visibility !== 'hidden';
    },
  });
}
```

### Schema Conversion

#### 1. Conversion Caching

Cache Zod to JSON Schema conversions:

```typescript
const schemaCache = new Map<string, JSONSchema>();

function convertZodToJsonSchema(zodSchema: z.ZodType): JSONSchema {
  const cacheKey = zodSchema._def.toString();

  if (schemaCache.has(cacheKey)) {
    return schemaCache.get(cacheKey)!;
  }

  const jsonSchema = performConversion(zodSchema);
  schemaCache.set(cacheKey, jsonSchema);
  return jsonSchema;
}
```

#### 2. Fallback Strategies

Handle complex schemas gracefully:

```typescript
function convertZodToJsonSchema(zodSchema: z.ZodType): JSONSchema {
  try {
    return performConversion(zodSchema);
  } catch (error) {
    // Fallback to generic object schema
    return {
      type: 'object',
      'x-zod': { unmapped: true },
      description: 'Complex schema - use JSON editor',
    };
  }
}
```

## Memory Management

### Component Cleanup

#### 1. Event Listeners

Clean up event listeners:

```typescript
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    // Handle keyboard shortcuts
  };

  document.addEventListener('keydown', handleKeyDown);

  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
}, []);
```

#### 2. Timers and Intervals

Clean up timers:

```typescript
useEffect(() => {
  const timer = setInterval(() => {
    // Periodic updates
  }, 1000);

  return () => clearInterval(timer);
}, []);
```

### State Management

#### 1. Local State

Keep state local when possible:

```typescript
// ✅ Local state for component-specific data
function ProcedureForm() {
  const [formData, setFormData] = useState({});
  // ...
}

// ❌ Avoid global state for temporary data
const globalFormState = useGlobalState('formData');
```

#### 2. State Normalization

Normalize complex state structures:

```typescript
// ✅ Normalized state
interface AppState {
  procedures: Record<string, Procedure>;
  routers: Record<string, Router>;
  ui: {
    selectedProcedure: string | null;
    searchTerm: string;
  };
}

// ❌ Nested state
interface AppState {
  routers: Array<{
    procedures: Array<{
      // Deeply nested data
    }>;
  }>;
}
```

## Network Performance

### Request Optimization

#### 1. Request Batching

Batch multiple requests when possible:

```typescript
// Use tRPC's built-in batching
const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      links: [
        httpBatchLink({
          url: '/api/trpc',
          maxBatchSize: 10, // Batch up to 10 requests
        }),
      ],
    };
  },
});
```

#### 2. Request Deduplication

Avoid duplicate requests:

```typescript
// React Query automatically deduplicates
const { data: user } = trpc.user.getById.useQuery(
  { id: userId },
  {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  }
);
```

### Response Optimization

#### 1. Compression

Enable compression on your server:

```typescript
// Express
import compression from 'compression';
app.use(compression());

// Next.js (next.config.js)
module.exports = {
  compress: true,
};
```

#### 2. Caching Headers

Set appropriate cache headers:

```typescript
// Cache introspection for 5 minutes
export async function GET() {
  const introspection = buildIntrospection(appRouter);

  return Response.json(introspection, {
    headers: {
      'Cache-Control': 'public, max-age=300',
      ETag: generateETag(introspection),
    },
  });
}
```

## Monitoring and Profiling

### Performance Monitoring

#### 1. Web Vitals

Monitor Core Web Vitals:

```typescript
// pages/_app.tsx
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function reportWebVitals(metric) {
  console.log(metric);
  // Send to analytics service
}

export function reportWebVitals(metric) {
  reportWebVitals(metric);
}
```

#### 2. Bundle Analysis

Regular bundle analysis:

```bash
# Add to CI/CD pipeline
npm run build
npm run analyze

# Fail build if bundle size exceeds limit
if [ $(stat -c%s "dist/bundle.js.gz") -gt 307200 ]; then
  echo "Bundle size exceeds 300KB limit"
  exit 1
fi
```

### Runtime Profiling

#### 1. React DevTools Profiler

Use React DevTools to identify performance bottlenecks:

```typescript
// Wrap expensive components
import { Profiler } from 'react';

function onRenderCallback(id, phase, actualDuration) {
  console.log('Component:', id, 'Phase:', phase, 'Duration:', actualDuration);
}

<Profiler id="SchemaDisplay" onRender={onRenderCallback}>
  <SchemaDisplay schema={schema} />
</Profiler>
```

#### 2. Performance API

Use browser Performance API:

```typescript
function measurePerformance(name: string, fn: () => void) {
  performance.mark(`${name}-start`);
  fn();
  performance.mark(`${name}-end`);
  performance.measure(name, `${name}-start`, `${name}-end`);

  const measure = performance.getEntriesByName(name)[0];
  console.log(`${name} took ${measure.duration}ms`);
}
```

## Best Practices Summary

### Development

1. **Use React DevTools** for component profiling
2. **Enable source maps** for debugging
3. **Monitor bundle size** during development
4. **Use TypeScript strict mode** for better optimization

### Production

1. **Enable compression** on your server
2. **Set cache headers** for static assets
3. **Monitor Core Web Vitals** in production
4. **Use CDN** for static assets when possible

### Code Organization

1. **Keep components small** and focused
2. **Use memoization** for expensive calculations
3. **Implement proper cleanup** in useEffect
4. **Avoid unnecessary re-renders** with React.memo

### Router Design

1. **Split large routers** into smaller sub-routers
2. **Use procedure metadata** effectively
3. **Hide internal procedures** from documentation
4. **Keep schemas simple** when possible

By following these optimization strategies, you can ensure tRPC Studio performs well even with
large, complex tRPC applications while maintaining a great developer experience.
