export default function TrpcStudioPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="card p-8 text-center">
          <h1 className="text-3xl font-bold mb-4">tRPC Studio</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The tRPC Studio UI will be available once tasks 8-11 are completed.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-8">
            For now, you can access the introspection data directly:
          </p>
          <div className="space-y-4">
            <a
              href="/__trpc-studio__/introspection"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary inline-block"
            >
              View Introspection JSON
            </a>
            <div className="text-xs text-gray-400 dark:text-gray-600">
              <p>This endpoint provides the router structure and metadata</p>
              <p>that will power the interactive Studio UI.</p>
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              What will be available in the full Studio:
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Interactive API documentation</li>
              <li>• Dynamic form generation from Zod schemas</li>
              <li>• Request/response testing playground</li>
              <li>• Environment profile management</li>
              <li>• SuperJSON-aware response rendering</li>
              <li>• Authentication and security features</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
