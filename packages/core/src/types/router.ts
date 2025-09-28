// Router-related type definitions
import type { JSONSchema } from './schema';

export type Visibility = 'public' | 'internal' | 'hidden';

export interface ProcedureMeta {
  summary?: string;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  visibility?: Visibility; // hidden: omit; internal: show with badge
  authRequired?: boolean;
  examples?: Array<{ input?: unknown; output?: unknown }>;
}

export interface ProcedureNode {
  name: string;
  type: 'query' | 'mutation'; // v1: subscriptions are out-of-scope
  input?: JSONSchema;
  output?: JSONSchema;
  meta?: ProcedureMeta;
}

export interface RouterNode {
  name: string;
  procedures: ProcedureNode[];
  children: RouterNode[];
}

export interface RouterIntrospection {
  routers: RouterNode[];
  meta: {
    generatedAt: string; // ISO timestamp
    trpcVersion?: string;
    transformer?: string | null; // In v11 transformer is client-configured; may be null
  };
}
