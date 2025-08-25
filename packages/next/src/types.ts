export type NextDevtoolsOptions = {
  router: unknown;                 // tRPC router instance
  trpcEndpoint: string;            // '/api/trpc' by default
  path?: string;                   // mount path
  enableInProd?: boolean;          // default false
  token?: string;                  // required when enableInProd
};
