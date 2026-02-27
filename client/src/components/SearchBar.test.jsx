import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SearchBar from './SearchBar';

describe('SearchBar', () => {
  it('updates the input when typing and clears when the clear button is clicked', async () => {
    render(<SearchBar />);

    const input = screen.getByRole('searchbox', { name: /search images/i });
    expect(input).toHaveValue('');

    fireEvent.change(input, { target: { value: 'sunset' } });
    expect(input).toHaveValue('sunset');

    const clearButton = await waitFor(() => screen.getByRole('button', { name: /clear search/i }), {
      timeout: 1000,
    });
    fireEvent.click(clearButton);
    expect(input).toHaveValue('');
  });
});
