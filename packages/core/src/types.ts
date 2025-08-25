export type Introspection = {
  routers: Record<string, RouterNode>;
  meta: { generatedAt: string; trpcVersion?: string; transformer?: 'superjson'|'json' };
};

export type RouterNode = {
  path: string;
  children: Record<string, RouterNode>;
  procedures: Procedure[];
};

export type Procedure = {
  key: string;
  type: 'query'|'mutation';
  inputSchema?: unknown;
  outputSchema?: unknown;
  meta?: {
    summary?: string;
    description?: string;
    tags?: string[];
    deprecated?: boolean;
    visibility?: 'public'|'internal'|'hidden';
    authRequired?: boolean;
    examples?: { input?: unknown; output?: unknown }[];
  };
};
