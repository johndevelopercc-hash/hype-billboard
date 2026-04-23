import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

const mockVideos = [
  {
    id: 'vid_003',
    title: 'TailwindCSS errores comunes - Tutorial',
    author: 'JuniorDev99',
    thumbnail: 'https://via.placeholder.com/300x200',
    publishedAt: 'Hace 2 años',
    hypeLevel: 0.3079,
    isCrown: true,
  },
  {
    id: 'vid_001',
    title: 'AWS explicado fácil',
    author: 'TechGuru',
    thumbnail: 'https://via.placeholder.com/300x200',
    publishedAt: 'Hace 1 mes',
    hypeLevel: 0.052,
    isCrown: false,
  },
];

// Mock at the hook level — we test App behavior, not fetch mechanics
vi.mock('./features/billboard/hooks/useVideos', () => ({
  useVideos: vi.fn(),
}));

import { useVideos } from './features/billboard/hooks/useVideos';
const mockUseVideos = vi.mocked(useVideos);

beforeEach(() => {
  mockUseVideos.mockReturnValue({
    videos: mockVideos,
    loading: false,
    error: null,
    refetch: vi.fn(),
  });
});

describe('App — user interactions and state management', () => {
  describe('Normal state', () => {
    it('renders the Crown Jewel card for the highest hype video', () => {
      render(<App />);
      expect(screen.getByTestId('crown-card')).toBeInTheDocument();
    });

    it('renders regular cards for all other videos', () => {
      render(<App />);
      expect(screen.getAllByTestId('video-card')).toHaveLength(1);
    });

    it('shows the app title to orient the user', () => {
      render(<App />);
      expect(screen.getByText(/cartelera de hype/i)).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('shows a loading indicator while videos are being fetched', () => {
      mockUseVideos.mockReturnValue({
        videos: [],
        loading: true,
        error: null,
        refetch: vi.fn(),
      });
      render(<App />);
      expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    });

    it('does NOT show cards while loading — avoids layout flash', () => {
      mockUseVideos.mockReturnValue({
        videos: [],
        loading: true,
        error: null,
        refetch: vi.fn(),
      });
      render(<App />);
      expect(screen.queryByTestId('crown-card')).not.toBeInTheDocument();
      expect(screen.queryByTestId('video-card')).not.toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('shows an error message when the API fails', () => {
      mockUseVideos.mockReturnValue({
        videos: [],
        loading: false,
        error: 'Failed to fetch videos',
        refetch: vi.fn(),
      });
      render(<App />);
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
    });

    it('offers a retry button so the user can recover without refreshing the page', () => {
      const refetch = vi.fn();
      mockUseVideos.mockReturnValue({
        videos: [],
        loading: false,
        error: 'Failed to fetch videos',
        refetch,
      });
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: /reintentar/i }));
      expect(refetch).toHaveBeenCalledOnce();
    });
  });

  describe('Language toggle', () => {
    it('switches UI text to English when the language button is clicked', async () => {
      render(<App />);
      // Initially in Spanish
      expect(screen.getByText(/cartelera de hype/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /switch language/i }));

      await waitFor(() => {
        expect(screen.getByText(/hype billboard/i)).toBeInTheDocument();
      });
    });

    it('switches back to Spanish on second click', async () => {
      render(<App />);
      const langBtn = screen.getByRole('button', { name: /switch language/i });

      fireEvent.click(langBtn); // → EN
      fireEvent.click(langBtn); // → ES

      await waitFor(() => {
        expect(screen.getByText(/cartelera de hype/i)).toBeInTheDocument();
      });
    });
  });
});
