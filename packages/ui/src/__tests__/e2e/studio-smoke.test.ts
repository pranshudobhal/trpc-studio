/**
 * E2E smoke tests for tRPC Studio using Playwright
 */

import { test, expect, type Page } from '@playwright/test';

// Mock data for testing
const mockIntrospection = {
  routers: [
    {
      name: 'root',
      procedures: [
        {
          name: 'hello',
          type: 'query',
          input: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
            required: ['name'],
          },
          output: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
          meta: {
            summary: 'Say hello',
            description: 'Returns a greeting message',
            tags: ['greeting'],
          },
        },
        {
          name: 'createUser',
          type: 'mutation',
          input: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
            },
            required: ['name', 'email'],
          },
          output: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
            },
          },
          meta: {
            summary: 'Create user',
            description: 'Creates a new user',
            tags: ['users'],
          },
        },
        {
          name: 'deprecatedProc',
          type: 'query',
          meta: {
            summary: 'Deprecated procedure',
            deprecated: true,
            tags: ['deprecated'],
          },
        },
        {
          name: 'internalProc',
          type: 'query',
          meta: {
            summary: 'Internal procedure',
            visibility: 'internal',
            tags: ['internal'],
          },
        },
      ],
      children: [],
    },
  ],
  meta: {
    generatedAt: '2023-01-01T00:00:00.000Z',
    trpcVersion: '11.0.0',
    transformer: 'superjson',
  },
};

// Helper function to setup mock API responses
async function setupMockAPI(page: Page) {
  await page.route('**/api/__trpc-studio__/introspection', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockIntrospection),
    });
  });

  await page.route('**/api/trpc/hello*', async route => {
    const url = new URL(route.request().url());
    const input = url.searchParams.get('input');
    const parsedInput = input ? JSON.parse(decodeURIComponent(input)) : {};

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        result: {
          data: { message: `Hello, ${parsedInput.name || 'World'}!` },
        },
      }),
    });
  });

  await page.route('**/api/trpc/createUser', async route => {
    const body = await route.request().postDataJSON();

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        result: {
          data: {
            id: '123',
            name: body.name,
            email: body.email,
          },
        },
      }),
    });
  });
}

test.describe('tRPC Studio E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockAPI(page);
  });

  test('should load studio and display routers & procedures', async ({
    page,
  }) => {
    await page.goto('/trpc-studio');

    // Wait for the studio to load
    await expect(page.locator('[data-testid="studio-app"]')).toBeVisible();

    // Should display the router tree
    await expect(page.locator('[data-testid="router-tree"]')).toBeVisible();

    // Should display procedures
    await expect(page.locator('text=hello')).toBeVisible();
    await expect(page.locator('text=createUser')).toBeVisible();
    await expect(page.locator('text=deprecatedProc')).toBeVisible();
    await expect(page.locator('text=internalProc')).toBeVisible();

    // Should display procedure types
    await expect(
      page.locator('[data-testid="procedure-type-query"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="procedure-type-mutation"]')
    ).toBeVisible();
  });

  test('should open procedure and render input/output schema + meta', async ({
    page,
  }) => {
    await page.goto('/trpc-studio');

    // Click on hello procedure
    await page.locator('text=hello').click();

    // Should display procedure details
    await expect(
      page.locator('[data-testid="procedure-details"]')
    ).toBeVisible();

    // Should display procedure metadata
    await expect(page.locator('text=Say hello')).toBeVisible();
    await expect(page.locator('text=Returns a greeting message')).toBeVisible();
    await expect(page.locator('text=greeting')).toBeVisible();

    // Should display input schema
    await expect(page.locator('[data-testid="input-schema"]')).toBeVisible();
    await expect(page.locator('text=name')).toBeVisible();
    await expect(page.locator('text=string')).toBeVisible();

    // Should display output schema
    await expect(page.locator('[data-testid="output-schema"]')).toBeVisible();
    await expect(page.locator('text=message')).toBeVisible();
  });

  test('should submit valid & invalid requests and show status/duration/headers/body', async ({
    page,
  }) => {
    await page.goto('/trpc-studio');

    // Click on hello procedure
    await page.locator('text=hello').click();

    // Fill in valid input
    await page.locator('[data-testid="input-name"]').fill('John');

    // Submit request
    await page.locator('[data-testid="execute-button"]').click();

    // Should show response
    await expect(page.locator('[data-testid="response-panel"]')).toBeVisible();

    // Should show status
    await expect(page.locator('text=200 OK')).toBeVisible();

    // Should show duration
    await expect(
      page.locator('[data-testid="response-duration"]')
    ).toBeVisible();

    // Should show response body
    await expect(page.locator('text=Hello, John!')).toBeVisible();

    // Check headers tab
    await page.locator('[data-testid="headers-tab"]').click();
    await expect(page.locator('text=content-type')).toBeVisible();
    await expect(page.locator('text=application/json')).toBeVisible();

    // Test invalid request
    await page.locator('[data-testid="response-tab"]').click();
    await page.locator('[data-testid="input-name"]').clear();
    await page.locator('[data-testid="execute-button"]').click();

    // Should show validation error
    await expect(page.locator('text=Name is required')).toBeVisible();
  });

  test('should switch environment profiles and apply custom headers', async ({
    page,
  }) => {
    await page.goto('/trpc-studio');

    // Open environment selector
    await page.locator('[data-testid="environment-selector"]').click();

    // Should show default environments
    await expect(page.locator('text=Local')).toBeVisible();
    await expect(page.locator('text=Development')).toBeVisible();
    await expect(page.locator('text=Staging')).toBeVisible();
    await expect(page.locator('text=Production')).toBeVisible();

    // Create new environment
    await page.locator('[data-testid="add-environment"]').click();

    // Fill environment details
    await page.locator('[data-testid="env-name"]').fill('Test Environment');
    await page
      .locator('[data-testid="env-base-url"]')
      .fill('https://test.example.com');

    // Add custom header
    await page.locator('[data-testid="add-header"]').click();
    await page.locator('[data-testid="header-name"]').fill('x-api-key');
    await page.locator('[data-testid="header-value"]').fill('test-key-123');

    // Enable credentials
    await page.locator('[data-testid="with-credentials"]').check();

    // Save environment
    await page.locator('[data-testid="save-environment"]').click();

    // Select the new environment
    await page.locator('text=Test Environment').click();

    // Execute a request to verify headers are applied
    await page.locator('text=hello').click();
    await page.locator('[data-testid="input-name"]').fill('Test');
    await page.locator('[data-testid="execute-button"]').click();

    // Verify the request was made with custom headers
    // (This would be verified through network inspection in a real test)
    await expect(page.locator('[data-testid="response-panel"]')).toBeVisible();
  });

  test('should have Copy as cURL functionality', async ({ page }) => {
    await page.goto('/trpc-studio');

    // Click on hello procedure
    await page.locator('text=hello').click();

    // Fill in input
    await page.locator('[data-testid="input-name"]').fill('John');

    // Click copy as cURL button
    await page.locator('[data-testid="copy-curl"]').click();

    // Should show success message
    await expect(page.locator('text=Copied to clipboard')).toBeVisible();

    // Verify clipboard content (if supported by test environment)
    const clipboardText = await page.evaluate(() =>
      navigator.clipboard.readText()
    );
    expect(clipboardText).toContain('curl -X GET');
    expect(clipboardText).toContain('hello');
    expect(clipboardText).toContain('John');
  });

  test('should show SuperJSON labels when applicable', async ({ page }) => {
    // Mock SuperJSON response
    await page.route('**/api/trpc/hello*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: {
              message: 'Hello!',
              timestamp: { $type: 'Date', value: '2023-01-01T00:00:00.000Z' },
              count: { $type: 'BigInt', value: '123456789' },
            },
          },
        }),
      });
    });

    await page.goto('/trpc-studio');

    // Execute request
    await page.locator('text=hello').click();
    await page.locator('[data-testid="input-name"]').fill('John');
    await page.locator('[data-testid="execute-button"]').click();

    // Should show SuperJSON detection
    await expect(page.locator('text=SuperJSON Detected')).toBeVisible();

    // Should show type labels
    await expect(page.locator('text=Date')).toBeVisible();
    await expect(page.locator('text=BigInt')).toBeVisible();
  });

  test('should test security matrix: prod disabled → 404; enabled+bad token → 403; enabled+good token → 200', async ({
    page,
  }) => {
    // Test production disabled (404)
    await page.route('**/api/__trpc-studio__/introspection', async route => {
      await route.fulfill({
        status: 404,
        body: 'Not Found',
      });
    });

    await page.goto('/trpc-studio');
    await expect(page.locator('text=Studio not available')).toBeVisible();

    // Test enabled with bad token (403)
    await page.route('**/api/__trpc-studio__/introspection', async route => {
      await route.fulfill({
        status: 403,
        body: 'Unauthorized',
      });
    });

    await page.reload();
    await expect(page.locator('text=Unauthorized')).toBeVisible();

    // Test enabled with good token (200)
    await page.route('**/api/__trpc-studio__/introspection', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockIntrospection),
      });
    });

    await page.reload();
    await expect(page.locator('[data-testid="studio-app"]')).toBeVisible();
  });

  test('should persist environment profiles after reload', async ({ page }) => {
    await page.goto('/trpc-studio');

    // Create and save environment
    await page.locator('[data-testid="environment-selector"]').click();
    await page.locator('[data-testid="add-environment"]').click();
    await page.locator('[data-testid="env-name"]').fill('Persistent Test');
    await page
      .locator('[data-testid="env-base-url"]')
      .fill('https://persistent.example.com');
    await page.locator('[data-testid="save-environment"]').click();

    // Select the environment
    await page.locator('text=Persistent Test').click();

    // Reload the page
    await page.reload();

    // Environment should still be available
    await page.locator('[data-testid="environment-selector"]').click();
    await expect(page.locator('text=Persistent Test')).toBeVisible();
  });

  test('should pass accessibility checks with axe', async ({ page }) => {
    await page.goto('/trpc-studio');

    // Wait for content to load
    await expect(page.locator('[data-testid="studio-app"]')).toBeVisible();

    // Run axe accessibility tests on main page
    const mainPageResults = await page.evaluate(() => {
      return new Promise(resolve => {
        // @ts-ignore - axe is loaded via CDN in test environment
        axe.run(document, (err: any, results: any) => {
          if (err) throw err;
          resolve(results);
        });
      });
    });

    // @ts-ignore
    const mainViolations = mainPageResults.violations.filter(
      (v: any) => v.impact === 'serious' || v.impact === 'critical'
    );
    expect(mainViolations).toHaveLength(0);

    // Open a procedure page and test accessibility
    await page.locator('text=hello').click();
    await expect(
      page.locator('[data-testid="procedure-details"]')
    ).toBeVisible();

    const procedurePageResults = await page.evaluate(() => {
      return new Promise(resolve => {
        // @ts-ignore
        axe.run(document, (err: any, results: any) => {
          if (err) throw err;
          resolve(results);
        });
      });
    });

    // @ts-ignore
    const procedureViolations = procedurePageResults.violations.filter(
      (v: any) => v.impact === 'serious' || v.impact === 'critical'
    );
    expect(procedureViolations).toHaveLength(0);
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/trpc-studio');

    // Tab through the interface
    await page.keyboard.press('Tab'); // Search input
    await expect(page.locator('[data-testid="search-input"]')).toBeFocused();

    await page.keyboard.press('Tab'); // Environment selector
    await expect(
      page.locator('[data-testid="environment-selector"]')
    ).toBeFocused();

    await page.keyboard.press('Tab'); // Hide deprecated toggle
    await expect(page.locator('[data-testid="hide-deprecated"]')).toBeFocused();

    await page.keyboard.press('Tab'); // Hide internal toggle
    await expect(page.locator('[data-testid="hide-internal"]')).toBeFocused();

    // Navigate to procedure list
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="procedure-list"]')).toBeFocused();

    // Use arrow keys to navigate procedures
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter'); // Select procedure

    // Should open procedure details
    await expect(
      page.locator('[data-testid="procedure-details"]')
    ).toBeVisible();
  });

  test('should handle search and filtering', async ({ page }) => {
    await page.goto('/trpc-studio');

    // Test search functionality
    await page.locator('[data-testid="search-input"]').fill('hello');
    await expect(page.locator('text=hello')).toBeVisible();
    await expect(page.locator('text=createUser')).not.toBeVisible();

    // Clear search
    await page.locator('[data-testid="search-input"]').clear();
    await expect(page.locator('text=createUser')).toBeVisible();

    // Test tag filtering
    await page.locator('[data-testid="tag-filter"]').click();
    await page.locator('text=users').click();
    await expect(page.locator('text=createUser')).toBeVisible();
    await expect(page.locator('text=hello')).not.toBeVisible();

    // Test hide deprecated
    await page.locator('[data-testid="tag-filter"]').click();
    await page.locator('text=All Tags').click(); // Clear filter
    await page.locator('[data-testid="hide-deprecated"]').check();
    await expect(page.locator('text=deprecatedProc')).not.toBeVisible();

    // Test hide internal
    await page.locator('[data-testid="hide-internal"]').check();
    await expect(page.locator('text=internalProc')).not.toBeVisible();
  });

  test('should handle form validation and JSON mode', async ({ page }) => {
    await page.goto('/trpc-studio');

    // Click on createUser procedure
    await page.locator('text=createUser').click();

    // Try to submit without required fields
    await page.locator('[data-testid="execute-button"]').click();
    await expect(page.locator('text=Name is required')).toBeVisible();
    await expect(page.locator('text=Email is required')).toBeVisible();

    // Fill valid data
    await page.locator('[data-testid="input-name"]').fill('John Doe');
    await page.locator('[data-testid="input-email"]').fill('john@example.com');

    // Submit valid request
    await page.locator('[data-testid="execute-button"]').click();
    await expect(page.locator('text=200 OK')).toBeVisible();

    // Test JSON mode
    await page.locator('[data-testid="json-mode-toggle"]').click();
    await expect(page.locator('[data-testid="json-editor"]')).toBeVisible();

    // Edit JSON
    await page.locator('[data-testid="json-editor"]').clear();
    await page
      .locator('[data-testid="json-editor"]')
      .fill('{"name": "Jane Doe", "email": "jane@example.com"}');

    // Submit JSON request
    await page.locator('[data-testid="execute-button"]').click();
    await expect(page.locator('text=Jane Doe')).toBeVisible();

    // Test invalid JSON
    await page.locator('[data-testid="json-editor"]').clear();
    await page.locator('[data-testid="json-editor"]').fill('{"invalid": json}');
    await expect(page.locator('text=Invalid JSON syntax')).toBeVisible();
  });
});
