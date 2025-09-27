// Router-related type definitions
export type Visibility = 'public' | 'internal' | 'hidden';

export interface ProcedureMeta {
  summary?: string;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  visibility?: Visibility;
  authRequired?: boolean;
  examples?: Array<{ input?: unknown; output?: unknown }>;
}

export interface ProcedureNode {
  name: string;
  type: 'query' | 'mutation';
  input?: unknown; // Will be JSONSchema
  output?: unknown; // Will be JSONSchema
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
    generatedAt: string;
    trpcVersion?: string;
    transformer?: string | null;
  };
}
