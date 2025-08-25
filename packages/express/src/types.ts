export type ExpressDevtoolsOptions = {
  router: unknown;                 // tRPC router instance
  trpcEndpoint: string;            // '/trpc' by default
  path?: string;                   // mount path
  enableInProd?: boolean;          // default false
  token?: string;                  // required when enableInProd
};
