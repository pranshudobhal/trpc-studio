import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PlaygroundForm } from '../playground-form';
import { JSONSchema } from '@trpc-studio/core';

// Mock the JSON viewer component
vi.mock('../json-viewer', () => ({
  JsonViewer: ({ data }: { data: unknown }) => (
    <div data-testid="json-viewer">{JSON.stringify(data)}</div>
  ),
}));

describe('PlaygroundForm', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  describe('String fields', () => {
    it('renders string input field', () => {
      const schema: JSONSchema = {
        type: 'string',
        title: 'Name',
        description: 'User name',
      };

      render(<PlaygroundForm schema={schema} onSubmit={mockOnSubmit} />);

      expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
      expect(screen.getByText('(User name)')).toBeInTheDocument();
    });

    it('handles string input with constraints', () => {
      const schema: JSONSchema = {
        type: 'string',
        title: 'Email',
        format: 'email',
        minLength: 5,
        maxLength: 50,
      };

      render(<PlaygroundForm schema={schema} onSubmit={mockOnSubmit} />);

      const input = screen.getByLabelText(/Email/) as HTMLInputElement;
      expect(input.type).toBe('email');
    });

    it('handles string input changes', async () => {
      const schema: JSONSchema = {
        type: 'string',
        title: 'Name',
      };

      render(<PlaygroundForm schema={schema} onSubmit={mockOnSubmit} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'test value');

      expect(input).toHaveValue('test value');
    });
  });

  describe('Number fields', () => {
    it('renders number input field', () => {
      const schema: JSONSchema = {
        type: 'number',
        title: 'Age',
        minimum: 0,
        maximum: 120,
      };

      render(<PlaygroundForm schema={schema} onSubmit={mockOnSubmit} />);

      const input = screen.getByLabelText(/Age/) as HTMLInputElement;
      expect(input.type).toBe('number');
      expect(input.min).toBe('0');
      expect(input.max).toBe('120');
    });

    it('handles integer type', () => {
      const schema: JSONSchema = {
        type: 'integer',
        title: 'Count',
      };

      render(<PlaygroundForm schema={schema} onSubmit={mockOnSubmit} />);

      const input = screen.getByLabelText(/Count/) as HTMLInputElement;
      expect(input.step).toBe('1');
    });
  });

  describe('Boolean fields', () => {
    it('renders checkbox for boolean field', () => {
      const schema: JSONSchema = {
        type: 'boolean',
        title: 'Is Active',
      };

      render(<PlaygroundForm schema={schema} onSubmit={mockOnSubmit} />);

      expect(screen.getByRole('checkbox')).toBeInTheDocument();
      expect(screen.getByLabelText(/Is Active/)).toBeInTheDocument();
    });

    it('handles boolean field changes', async () => {
      const schema: JSONSchema = {
        type: 'boolean',
        title: 'Is Active',
      };

      render(<PlaygroundForm schema={schema} onSubmit={mockOnSubmit} />);

      const checkbox = screen.getByRole('checkbox');
      await userEvent.click(checkbox);

      expect(checkbox).toBeChecked();
    });
  });

  describe('Object fields', () => {
    it('renders nested object properties', () => {
      const schema: JSONSchema = {
        type: 'object',
        title: 'User',
        properties: {
          name: {
            type: 'string',
            title: 'Name',
          },
          age: {
            type: 'number',
            title: 'Age',
          },
        },
        required: ['name'],
      };

      render(<PlaygroundForm schema={schema} onSubmit={mockOnSubmit} />);

      expect(screen.getByText('User')).toBeInTheDocument();
      expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Age/)).toBeInTheDocument();
      expect(screen.getByText('name')).toBeInTheDocument();
      expect(screen.getByText('*')).toBeInTheDocument(); // Required indicator
    });
  });

  describe('Array fields', () => {
    it('renders array field with add/remove functionality', () => {
      const schema: JSONSchema = {
        type: 'array',
        title: 'Tags',
        items: {
          type: 'string',
        },
      };

      render(<PlaygroundForm schema={schema} onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Tags')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /add item/i })
      ).toBeInTheDocument();
      expect(screen.getByText(/no items/i)).toBeInTheDocument();
    });

    it('adds and removes array items', async () => {
      const schema: JSONSchema = {
        type: 'array',
        title: 'Tags',
        items: {
          type: 'string',
        },
      };

      render(<PlaygroundForm schema={schema} onSubmit={mockOnSubmit} />);

      const addButton = screen.getByRole('button', { name: /add item/i });

      // Add an item
      await userEvent.click(addButton);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByLabelText('Remove item')).toBeInTheDocument();

      // Remove the item
      const removeButton = screen.getByLabelText('Remove item');
      await userEvent.click(removeButton);

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
  });

  describe('Enum fields', () => {
    it('renders select dropdown for enum field', () => {
      const schema: JSONSchema = {
        title: 'Status',
        enum: ['active', 'inactive', 'pending'],
      };

      render(<PlaygroundForm schema={schema} onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Status')).toBeInTheDocument();
      // The select component uses a combobox role
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  describe('Union fields', () => {
    it('renders union field with type selector', () => {
      const schema: JSONSchema = {
        title: 'Value',
        oneOf: [
          { type: 'string', title: 'Text' },
          { type: 'number', title: 'Number' },
        ],
      };

      render(<PlaygroundForm schema={schema} onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Value')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  describe('Unmapped fields', () => {
    it('renders JSON editor for unmapped schema', () => {
      const schema: JSONSchema = {
        type: 'object',
        title: 'Complex',
        'x-zod': {
          unmapped: true,
        },
      };

      render(<PlaygroundForm schema={schema} onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Complex')).toBeInTheDocument();
      expect(screen.getByText('(JSON Editor)')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  describe('JSON mode', () => {
    it('toggles between form and JSON mode', async () => {
      const schema: JSONSchema = {
        type: 'string',
        title: 'Name',
      };

      render(<PlaygroundForm schema={schema} onSubmit={mockOnSubmit} />);

      const toggleButton = screen.getByRole('button', { name: /json mode/i });

      // Switch to JSON mode
      await userEvent.click(toggleButton);

      expect(screen.getByText('Form Mode')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toHaveClass('font-mono');
    });

    it('validates JSON syntax in JSON mode', async () => {
      const schema: JSONSchema = {
        type: 'string',
        title: 'Name',
      };

      render(<PlaygroundForm schema={schema} onSubmit={mockOnSubmit} />);

      // Switch to JSON mode
      const toggleButton = screen.getByRole('button', { name: /json mode/i });
      await userEvent.click(toggleButton);

      const textarea = screen.getByRole('textbox');

      // Enter invalid JSON by setting the value directly
      fireEvent.change(textarea, { target: { value: '{ invalid json' } });

      await waitFor(() => {
        expect(screen.getByText('Invalid JSON syntax')).toBeInTheDocument();
      });
    });
  });

  describe('Form submission', () => {
    it('renders form with submit button', () => {
      const schema: JSONSchema = {
        type: 'string',
        title: 'Name',
      };

      render(<PlaygroundForm schema={schema} onSubmit={mockOnSubmit} />);

      expect(
        screen.getByRole('button', { name: /execute request/i })
      ).toBeInTheDocument();
    });

    it('handles default values', () => {
      const schema: JSONSchema = {
        type: 'string',
        default: 'default value',
      };

      const defaultValues = { root: 'custom default' };

      render(
        <PlaygroundForm
          schema={schema}
          onSubmit={mockOnSubmit}
          defaultValues={defaultValues}
        />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('custom default');
    });
  });
});
