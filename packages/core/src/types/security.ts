// Security-related type definitions
export interface SecurityConfig {
  enabled?: boolean;
  token?: string;
  getToken?: (req: unknown) => string | null;
}

export interface StudioOptions {
  router: unknown; // AnyRouter
  trpcEndpoint?: string;
  studioPath?: string;
  introspectionPath?: string;
  enabled?: boolean;
  token?: string;
  getToken?: (req: unknown) => string | null;
}
