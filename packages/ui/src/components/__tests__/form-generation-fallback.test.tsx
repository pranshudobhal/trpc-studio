/**
 * Tests for form generation with x-zod.unmapped fallback behavior
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PlaygroundForm } from '../playground-form';
import type { JSONSchema } from '@trpc-studio/core';

// Mock the JSON viewer component
vi.mock('../json-viewer', () => ({
  JsonViewer: ({ data }: { data: unknown }) => (
    <div data-testid="json-viewer">{JSON.stringify(data)}</div>
  ),
}));

describe('Form Generation Fallback Behavior', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  describe('x-zod.unmapped handling', () => {
    it('should render JSON editor for unmapped schema', () => {
      const schema: JSONSchema = {
        type: 'object',
        title: 'Unmapped Schema',
        'x-zod': {
          unmapped: true,
          reason: 'Conversion failed',
        },
      };

      render(<PlaygroundForm schema={schema} onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Unmapped Schema')).toBeInTheDocument();
      expect(screen.getByText('(JSON Editor)')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByText(/conversion failed/i)).toBeInTheDocument();
    });

    it('should render JSON editor for unmapped object property', () => {
      const schema: JSONSchema = {
        type: 'object',
        title: 'Mixed Schema',
        properties: {
          normalField: {
            type: 'string',
            title: 'Normal Field',
          },
          unmappedField: {
            type: 'object',
            title: 'Unmapped Field',
            'x-zod': {
              unmapped: true,
              reason: 'Complex refinement not supported',
            },
          },
        },
        required: ['normalField'],
      };

      render(<PlaygroundForm schema={schema} onSubmit={mockOnSubmit} />);

      // Should render normal field as regular input
      expect(screen.getByLabelText(/Normal Field/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Normal Field/)).toHaveAttribute(
        'type',
        'text'
      );

      // Should render unmapped field as JSON editor
      expect(screen.getByText('Unmapped Field')).toBeInTheDocument();
      expect(screen.getByText('(JSON Editor)')).toBeInTheDocument();

      // Should show reason for unmapping
      expect(
        screen.getByText(/complex refinement not supported/i)
      ).toBeInTheDocument();
    });

    it('should render JSON editor for unmapped array items', () => {
      const schema: JSONSchema = {
        type: 'array',
        title: 'Array with Unmapped Items',
        items: {
          type: 'object',
          'x-zod': {
            unmapped: true,
            reason: 'Array item conversion failed',
          },
        },
      };

      render(<PlaygroundForm schema={schema} onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Array with Unmapped Items')).toBeInTheDocument();

      // Add an item to see the JSON editor
      const addButton = screen.getByRole('button', { name: /add item/i });
      fireEvent.click(addButton);

      // Should render JSON editor for the array item
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(
        screen.getByText(/array item conversion failed/i)
      ).toBeInTheDocument();
    });

    it('should render JSON editor for unmapped union member', () => {
      const schema: JSONSchema = {
        title: 'Union with Unmapped Member',
        oneOf: [
          {
            type: 'string',
            title: 'String Option',
          },
          {
            type: 'object',
            title: 'Unmapped Option',
            'x-zod': {
              unmapped: true,
              reason: 'Union member conversion failed',
            },
          },
        ],
      };

      render(<PlaygroundForm schema={schema} onSubmit={mockOnSubmit} />);

      // Select the unmapped union member
      const typeSelector = screen.getByRole('combobox');
      fireEvent.change(typeSelector, { target: { value: '1' } }); // Select second option

      // Should render JSON editor for unmapped union member
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(
        screen.getByText(/union member conversion failed/i)
      ).toBeInTheDocument();
    });
  });

  describe('Partial unmapping in complex schemas', () => {
    it('should handle object with mixed mapped/unmapped properties', () => {
      const schema: JSONSchema = {
        type: 'object',
        title: 'User Profile',
        properties: {
          name: {
            type: 'string',
            title: 'Name',
          },
          email: {
            type: 'string',
            title: 'Email',
            format: 'email',
          },
          preferences: {
            type: 'object',
            title: 'Preferences',
            'x-zod': {
              unmapped: true,
              reason: 'Complex preferences schema not supported',
            },
          },
          metadata: {
            type: 'object',
            title: 'Metadata',
            properties: {
              tags: {
                type: 'array',
                items: { type: 'string' },
              },
              customData: {
                'x-zod': {
                  unmapped: true,
                  reason: 'Custom data refinement failed',
                },
              },
            },
          },
        },
        required: ['name', 'email'],
      };

      render(<PlaygroundForm schema={schema} onSubmit={mockOnSubmit} />);

      // Should render normal fields
      expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email/)).toBeInTheDocument();

      // Should render JSON editor for unmapped preferences
      expect(screen.getByText('Preferences')).toBeInTheDocument();
      expect(screen.getByText('(JSON Editor)')).toBeInTheDocument();

      // Should render nested metadata with mixed fields
      expect(screen.getByText('Metadata')).toBeInTheDocument();

      // Tags should render as array field
      const addTagButton = screen.getByRole('button', { name: /add item/i });
      expect(addTagButton).toBeInTheDocument();

      // Custom data should render as JSON editor
      expect(
        screen.getByText(/custom data refinement failed/i)
      ).toBeInTheDocument();
    });

    it('should handle array with mixed mapped/unmapped items', () => {
      const schema: JSONSchema = {
        type: 'array',
        title: 'Mixed Items Array',
        items: {
          oneOf: [
            {
              type: 'string',
              title: 'String Item',
            },
            {
              type: 'object',
              title: 'Unmapped Object Item',
              'x-zod': {
                unmapped: true,
                reason: 'Complex object validation failed',
              },
            },
          ],
        },
      };

      render(<PlaygroundForm schema={schema} onSubmit={mockOnSubmit} />);

      // Add an item
      const addButton = screen.getByRole('button', { name: /add item/i });
      fireEvent.click(addButton);

      // Should show type selector for union
      const typeSelector = screen.getByRole('combobox');
      expect(typeSelector).toBeInTheDocument();

      // Select string option
      fireEvent.change(typeSelector, { target: { value: '0' } });
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text');

      // Select unmapped object option
      fireEvent.change(typeSelector, { target: { value: '1' } });
      expect(
        screen.getByText(/complex object validation failed/i)
      ).toBeInTheDocument();
    });
  });

  describe('JSON editor functionality for unmapped fields', () => {
    it('should allow editing JSON in unmapped field', async () => {
      const schema: JSONSchema = {
        type: 'object',
        title: 'Unmapped Config',
        'x-zod': {
          unmapped: true,
          reason: 'Configuration schema too complex',
        },
      };

      render(<PlaygroundForm schema={schema} onSubmit={mockOnSubmit} />);

      const jsonEditor = screen.getByRole('textbox');

      // Should start with empty object
      expect(jsonEditor).toHaveValue('{}');

      // Edit the JSON
      await userEvent.clear(jsonEditor);
      await userEvent.type(jsonEditor, '{"key": "value", "number": 42}');

      expect(jsonEditor).toHaveValue('{"key": "value", "number": 42}');
    });

    it('should validate JSON syntax in unmapped field', async () => {
      const schema: JSONSchema = {
        type: 'object',
        title: 'Unmapped Config',
        'x-zod': {
          unmapped: true,
          reason: 'Configuration schema too complex',
        },
      };

      render(<PlaygroundForm schema={schema} onSubmit={mockOnSubmit} />);

      const jsonEditor = screen.getByRole('textbox');

      // Enter invalid JSON
      await userEvent.clear(jsonEditor);
      await userEvent.type(jsonEditor, '{"invalid": json}');

      await waitFor(() => {
        expect(screen.getByText(/invalid json syntax/i)).toBeInTheDocument();
      });
    });

    it('should submit valid JSON from unmapped field', async () => {
      const schema: JSONSchema = {
        type: 'object',
        title: 'Unmapped Config',
        'x-zod': {
          unmapped: true,
          reason: 'Configuration schema too complex',
        },
      };

      render(<PlaygroundForm schema={schema} onSubmit={mockOnSubmit} />);

      const jsonEditor = screen.getByRole('textbox');

      // Enter valid JSON
      await userEvent.clear(jsonEditor);
      await userEvent.type(jsonEditor, '{"setting": "enabled", "count": 5}');

      const submitButton = screen.getByRole('button', {
        name: /execute request/i,
      });
      await userEvent.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalledWith({
        setting: 'enabled',
        count: 5,
      });
    });

    it('should prevent submission with invalid JSON in unmapped field', async () => {
      const schema: JSONSchema = {
        type: 'object',
        title: 'Unmapped Config',
        'x-zod': {
          unmapped: true,
          reason: 'Configuration schema too complex',
        },
      };

      render(<PlaygroundForm schema={schema} onSubmit={mockOnSubmit} />);

      const jsonEditor = screen.getByRole('textbox');

      // Enter invalid JSON
      await userEvent.clear(jsonEditor);
      await userEvent.type(jsonEditor, '{"invalid": }');

      const submitButton = screen.getByRole('button', {
        name: /execute request/i,
      });
      await userEvent.click(submitButton);

      // Should not submit
      expect(mockOnSubmit).not.toHaveBeenCalled();
      expect(screen.getByText(/invalid json syntax/i)).toBeInTheDocument();
    });
  });

  describe('Mixed form with unmapped fields', () => {
    it('should combine regular form fields with JSON editor fields', async () => {
      const schema: JSONSchema = {
        type: 'object',
        title: 'Mixed Form',
        properties: {
          name: {
            type: 'string',
            title: 'Name',
          },
          config: {
            type: 'object',
            title: 'Configuration',
            'x-zod': {
              unmapped: true,
              reason: 'Complex configuration schema',
            },
          },
          enabled: {
            type: 'boolean',
            title: 'Enabled',
          },
        },
        required: ['name'],
      };

      render(<PlaygroundForm schema={schema} onSubmit={mockOnSubmit} />);

      // Fill regular fields
      const nameInput = screen.getByLabelText(/Name/);
      await userEvent.type(nameInput, 'Test User');

      const enabledCheckbox = screen.getByLabelText(/Enabled/);
      await userEvent.click(enabledCheckbox);

      // Fill JSON editor field
      const jsonEditor = screen.getByRole('textbox', {
        name: /configuration/i,
      });
      await userEvent.clear(jsonEditor);
      await userEvent.type(
        jsonEditor,
        '{"theme": "dark", "notifications": true}'
      );

      // Submit form
      const submitButton = screen.getByRole('button', {
        name: /execute request/i,
      });
      await userEvent.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Test User',
        config: {
          theme: 'dark',
          notifications: true,
        },
        enabled: true,
      });
    });

    it('should handle validation errors in mixed form', async () => {
      const schema: JSONSchema = {
        type: 'object',
        title: 'Mixed Form',
        properties: {
          name: {
            type: 'string',
            title: 'Name',
            minLength: 3,
          },
          config: {
            type: 'object',
            title: 'Configuration',
            'x-zod': {
              unmapped: true,
              reason: 'Complex configuration schema',
            },
          },
        },
        required: ['name'],
      };

      render(<PlaygroundForm schema={schema} onSubmit={mockOnSubmit} />);

      // Enter invalid regular field
      const nameInput = screen.getByLabelText(/Name/);
      await userEvent.type(nameInput, 'ab'); // Too short

      // Enter invalid JSON
      const jsonEditor = screen.getByRole('textbox', {
        name: /configuration/i,
      });
      await userEvent.clear(jsonEditor);
      await userEvent.type(jsonEditor, '{invalid}');

      const submitButton = screen.getByRole('button', {
        name: /execute request/i,
      });
      await userEvent.click(submitButton);

      // Should show both validation errors
      expect(
        screen.getByText(/must be at least 3 characters/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/invalid json syntax/i)).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility for unmapped fields', () => {
    it('should have proper ARIA labels for JSON editor', () => {
      const schema: JSONSchema = {
        type: 'object',
        title: 'Unmapped Field',
        'x-zod': {
          unmapped: true,
          reason: 'Schema conversion failed',
        },
      };

      render(<PlaygroundForm schema={schema} onSubmit={mockOnSubmit} />);

      const jsonEditor = screen.getByRole('textbox');
      expect(jsonEditor).toHaveAttribute(
        'aria-label',
        'JSON editor for Unmapped Field'
      );
      expect(jsonEditor).toHaveAttribute('aria-describedby');

      const description = document.getElementById(
        jsonEditor.getAttribute('aria-describedby')!
      );
      expect(description).toHaveTextContent(/schema conversion failed/i);
    });

    it('should announce JSON validation errors to screen readers', async () => {
      const schema: JSONSchema = {
        type: 'object',
        title: 'Unmapped Field',
        'x-zod': {
          unmapped: true,
          reason: 'Schema conversion failed',
        },
      };

      render(<PlaygroundForm schema={schema} onSubmit={mockOnSubmit} />);

      const jsonEditor = screen.getByRole('textbox');

      // Enter invalid JSON
      await userEvent.clear(jsonEditor);
      await userEvent.type(jsonEditor, '{invalid}');

      // Error should be announced
      const errorElement = screen.getByRole('alert');
      expect(errorElement).toHaveTextContent(/invalid json syntax/i);
    });
  });
});
