import React from 'react';

export type StudioAppProps = {
  introspectionUrl?: string;
};

export function StudioApp({ introspectionUrl = '/__trpc-studio__/introspection' }: StudioAppProps) {
  // Placeholder UI — to be replaced with full Docs + Playground
  return (
    <div style={{fontFamily:'ui-sans-serif, system-ui', padding: 16}}>
      <h1>trpc-studio (UI skeleton)</h1>
      <p>Introspection endpoint: <code>{introspectionUrl}</code></p>
      <p>Replace this with RouterTree, DocsPanel, and Playground components.</p>
    </div>
  );
}
