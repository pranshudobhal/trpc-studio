import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { EnvironmentSelector, type Environment } from '../environment-selector';
import { describe, expect, it, vi } from 'vitest';
import { beforeEach } from 'node:test';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock clipboard API
const mockWriteText = vi.fn();
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: mockWriteText,
  },
  writable: true,
});

describe('EnvironmentSelector', () => {
  const mockOnEnvironmentChange = vi.fn();

  const mockEnvironment: Environment = {
    id: 'test',
    name: 'Test Environment',
    baseUrl: 'https://test.example.com',
    headers: { 'x-api-key': 'test-key' },
    withCredentials: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockWriteText.mockClear();
  });

  it('renders with default environments when localStorage is empty', async () => {
    render(
      <EnvironmentSelector
        selectedEnvironment={undefined}
        onEnvironmentChange={mockOnEnvironmentChange}
      />
    );

    // Should load default environments
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith(
      'trpc-studio-environments'
    );

    // Should call onEnvironmentChange with first default environment
    await waitFor(() => {
      expect(mockOnEnvironmentChange).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'local',
          name: 'Local',
          baseUrl: 'http://localhost:3000',
        })
      );
    });
  });

  it('loads environments from localStorage', async () => {
    const savedEnvironments = [mockEnvironment];
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedEnvironments));

    render(
      <EnvironmentSelector
        selectedEnvironment={undefined}
        onEnvironmentChange={mockOnEnvironmentChange}
      />
    );

    await waitFor(() => {
      expect(mockOnEnvironmentChange).toHaveBeenCalledWith(mockEnvironment);
    });
  });

  it('handles corrupted localStorage data gracefully', async () => {
    mockLocalStorage.getItem.mockReturnValue('invalid-json');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <EnvironmentSelector
        selectedEnvironment={undefined}
        onEnvironmentChange={mockOnEnvironmentChange}
      />
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to load environments from localStorage:',
      expect.any(Error)
    );

    // Should fall back to default environments
    await waitFor(() => {
      expect(mockOnEnvironmentChange).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'local' })
      );
    });

    consoleSpy.mockRestore();
  });

  it('renders selected environment', async () => {
    const environments = [
      mockEnvironment,
      {
        id: 'prod',
        name: 'Production',
        baseUrl: 'https://api.example.com',
        headers: {},
        withCredentials: false,
      },
    ];

    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(environments));

    render(
      <EnvironmentSelector
        selectedEnvironment={mockEnvironment}
        onEnvironmentChange={mockOnEnvironmentChange}
      />
    );

    // Should display the selected environment
    expect(screen.getByText('Test Environment')).toBeInTheDocument();
    expect(screen.getByText('test.example.com')).toBeInTheDocument();
  });

  it('renders environment selector with dropdown button', async () => {
    render(
      <EnvironmentSelector
        selectedEnvironment={mockEnvironment}
        onEnvironmentChange={mockOnEnvironmentChange}
      />
    );

    // Should render the environment selector
    expect(screen.getByRole('combobox')).toBeInTheDocument();

    // Should render the dropdown menu button
    const dropdownButton = screen.getByRole('button', {
      expanded: false,
    });
    expect(dropdownButton).toBeInTheDocument();
    expect(dropdownButton).toHaveAttribute('aria-haspopup', 'menu');
  });
});
