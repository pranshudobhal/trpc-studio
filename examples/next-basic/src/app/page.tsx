'use client';

import { useState } from 'react';
import { trpc } from '~/lib/trpc';

export default function HomePage() {
  const [name, setName] = useState('World');
  const [userId, setUserId] = useState(1);

  // Simple query example
  const helloQuery = trpc.hello.useQuery({ text: name });

  // Complex data query example
  const complexDataQuery = trpc.complexData.useQuery({});

  // User query example
  const userQuery = trpc.user.getById.useQuery({ id: userId });

  // User list query example
  const userListQuery = trpc.user.list.useQuery({
    limit: 5,
    sortBy: 'name',
    sortOrder: 'asc',
  });

  // Mutation examples
  const createUserMutation = trpc.user.create.useMutation({
    onSuccess: () => {
      // Invalidate and refetch user list
      trpc.useUtils().user.list.invalidate();
    },
  });

  const createPostMutation = trpc.post.create.useMutation();

  const handleCreateUser = () => {
    createUserMutation.mutate({
      name: 'Jane Doe',
      email: 'jane@example.com',
      age: 28,
      preferences: {
        theme: 'dark',
        notifications: true,
        language: 'en',
      },
      tags: ['developer', 'react'],
    });
  };

  const handleCreatePost = () => {
    createPostMutation.mutate({
      title: 'My First Blog Post',
      content:
        'This is the content of my first blog post. It demonstrates tRPC mutations.',
      published: true,
      tags: ['blog', 'trpc', 'nextjs'],
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            tRPC Studio Example
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
            Comprehensive Next.js 14 App Router example with tRPC, Tailwind v4,
            and SuperJSON
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <span className="badge badge-primary">Next.js 14</span>
            <span className="badge badge-primary">App Router</span>
            <span className="badge badge-primary">tRPC v11</span>
            <span className="badge badge-primary">Tailwind v4</span>
            <span className="badge badge-primary">SuperJSON</span>
            <span className="badge badge-primary">TanStack Query v5</span>
          </div>
          <div className="flex justify-center gap-4">
            <a
              href="/trpc-studio"
              className="btn btn-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open tRPC Studio
            </a>
            <a
              href="/__trpc-studio__/introspection"
              className="btn btn-outline"
              target="_blank"
              rel="noopener noreferrer"
            >
              View Introspection JSON
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Simple Query Example */}
          <div className="card p-6">
            <h2 className="text-2xl font-semibold mb-4">Simple Query</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name:</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Enter a name"
                />
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                <h3 className="font-medium mb-2">Result:</h3>
                {helloQuery.isLoading && <p>Loading...</p>}
                {helloQuery.error && (
                  <p className="text-red-600">
                    Error: {helloQuery.error.message}
                  </p>
                )}
                {helloQuery.data && (
                  <div>
                    <p>
                      <strong>Greeting:</strong> {helloQuery.data.greeting}
                    </p>
                    <p>
                      <strong>Timestamp:</strong>{' '}
                      {helloQuery.data.timestamp.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Complex Data Types */}
          <div className="card p-6">
            <h2 className="text-2xl font-semibold mb-4">
              Complex Data Types (SuperJSON)
            </h2>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
              {complexDataQuery.isLoading && <p>Loading...</p>}
              {complexDataQuery.error && (
                <p className="text-red-600">
                  Error: {complexDataQuery.error.message}
                </p>
              )}
              {complexDataQuery.data && (
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Date:</strong>{' '}
                    {complexDataQuery.data.date.toISOString()}
                  </p>
                  <p>
                    <strong>BigInt:</strong>{' '}
                    {complexDataQuery.data.bigint.toString()}
                  </p>
                  <p>
                    <strong>Map:</strong>{' '}
                    {JSON.stringify(
                      Array.from(complexDataQuery.data.map.entries())
                    )}
                  </p>
                  <p>
                    <strong>Set:</strong>{' '}
                    {JSON.stringify(Array.from(complexDataQuery.data.set))}
                  </p>
                  <p>
                    <strong>Nested Array:</strong>{' '}
                    {complexDataQuery.data.nested.array.length} items
                  </p>
                  <p>
                    <strong>Optional:</strong>{' '}
                    {complexDataQuery.data.nested.optional || 'undefined'}
                  </p>
                  <p>
                    <strong>Nullable:</strong>{' '}
                    {complexDataQuery.data.nested.nullable || 'null'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* User Query */}
          <div className="card p-6">
            <h2 className="text-2xl font-semibold mb-4">User Query</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  User ID:
                </label>
                <input
                  type="number"
                  value={userId}
                  onChange={e => setUserId(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-md"
                  min="1"
                />
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                {userQuery.isLoading && <p>Loading...</p>}
                {userQuery.error && (
                  <p className="text-red-600">
                    Error: {userQuery.error.message}
                  </p>
                )}
                {userQuery.data && (
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>Name:</strong> {userQuery.data.name}
                    </p>
                    <p>
                      <strong>Email:</strong> {userQuery.data.email}
                    </p>
                    <p>
                      <strong>Age:</strong> {userQuery.data.age}
                    </p>
                    <p>
                      <strong>Role:</strong>{' '}
                      <span className="badge badge-primary">
                        {userQuery.data.role}
                      </span>
                    </p>
                    <p>
                      <strong>Theme:</strong> {userQuery.data.preferences.theme}
                    </p>
                    <p>
                      <strong>Tags:</strong> {userQuery.data.tags.join(', ')}
                    </p>
                    <p>
                      <strong>Created:</strong>{' '}
                      {userQuery.data.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* User List */}
          <div className="card p-6">
            <h2 className="text-2xl font-semibold mb-4">User List</h2>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
              {userListQuery.isLoading && <p>Loading...</p>}
              {userListQuery.error && (
                <p className="text-red-600">
                  Error: {userListQuery.error.message}
                </p>
              )}
              {userListQuery.data && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {userListQuery.data.users.length} of{' '}
                    {userListQuery.data.total} users
                  </p>
                  {userListQuery.data.users.map(user => (
                    <div
                      key={user.id}
                      className="border-l-4 border-primary-500 pl-3"
                    >
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {user.email}
                      </p>
                      <div className="flex gap-1 mt-1">
                        <span className="badge badge-gray">{user.role}</span>
                        {user.tags.map(tag => (
                          <span key={tag} className="badge badge-primary">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mutations */}
          <div className="card p-6 lg:col-span-2">
            <h2 className="text-2xl font-semibold mb-4">Mutations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Create User */}
              <div>
                <h3 className="text-lg font-medium mb-3">Create User</h3>
                <button
                  onClick={handleCreateUser}
                  disabled={createUserMutation.isPending}
                  className="btn btn-primary w-full mb-3"
                >
                  {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                </button>
                {createUserMutation.error && (
                  <p className="text-red-600 text-sm mb-2">
                    Error: {createUserMutation.error.message}
                  </p>
                )}
                {createUserMutation.data && (
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
                    <p className="text-green-800 dark:text-green-200 text-sm">
                      ✅ User created: {createUserMutation.data.name} (ID:{' '}
                      {createUserMutation.data.id})
                    </p>
                  </div>
                )}
              </div>

              {/* Create Post */}
              <div>
                <h3 className="text-lg font-medium mb-3">Create Post</h3>
                <button
                  onClick={handleCreatePost}
                  disabled={createPostMutation.isPending}
                  className="btn btn-primary w-full mb-3"
                >
                  {createPostMutation.isPending ? 'Creating...' : 'Create Post'}
                </button>
                {createPostMutation.error && (
                  <p className="text-red-600 text-sm mb-2">
                    Error: {createPostMutation.error.message}
                  </p>
                )}
                {createPostMutation.data && (
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
                    <p className="text-green-800 dark:text-green-200 text-sm">
                      ✅ Post created: {createPostMutation.data.title}
                    </p>
                    <p className="text-green-700 dark:text-green-300 text-xs mt-1">
                      ID: {createPostMutation.data.id}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Features Overview */}
        <div className="mt-12 card p-8">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            Features Demonstrated
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 dark:text-blue-400 text-xl">
                  🔧
                </span>
              </div>
              <h3 className="font-semibold mb-2">Complex Zod Schemas</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Constraints, unions, discriminated unions, enums, and nested
                objects
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-green-600 dark:text-green-400 text-xl">
                  🚀
                </span>
              </div>
              <h3 className="font-semibold mb-2">SuperJSON Support</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Date, BigInt, Map, Set, and other complex JavaScript types
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-purple-600 dark:text-purple-400 text-xl">
                  📝
                </span>
              </div>
              <h3 className="font-semibold mb-2">Rich Metadata</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Summaries, descriptions, tags, examples, and visibility controls
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-yellow-600 dark:text-yellow-400 text-xl">
                  🔒
                </span>
              </div>
              <h3 className="font-semibold mb-2">Authentication</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Protected procedures with mock authentication system
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-red-600 dark:text-red-400 text-xl">
                  🎨
                </span>
              </div>
              <h3 className="font-semibold mb-2">Tailwind v4</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Modern CSS with custom theme variables and dark mode
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-indigo-600 dark:text-indigo-400 text-xl">
                  ⚡
                </span>
              </div>
              <h3 className="font-semibold mb-2">TanStack Query</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Caching, background updates, and optimistic mutations
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
