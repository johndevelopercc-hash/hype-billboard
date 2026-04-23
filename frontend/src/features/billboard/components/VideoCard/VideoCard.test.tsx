import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VideoCard } from './VideoCard';
import type { Video } from '../../types';

// Explicit i18n mock — tests must not depend on global i18n initialization order.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'card.by': 'por',
      'card.hypeLevel': 'Nivel de Hype',
    }[key] ?? key),
  }),
}));

const mockVideo: Video = {
  id: 'vid_001',
  title: 'AWS explicado fácil',
  author: 'JuniorDev99',
  thumbnail: 'https://via.placeholder.com/300x200',
  publishedAt: 'Hace 2 meses',
  hypeLevel: 0.0519,
  isCrown: false,
};

describe('VideoCard — user-facing behavior', () => {
  it('shows the video title so the user knows what to watch', () => {
    render(<VideoCard video={mockVideo} />);
    expect(screen.getByText('AWS explicado fácil')).toBeInTheDocument();
  });

  it('shows the channel author so the user knows who published it', () => {
    render(<VideoCard video={mockVideo} />);
    expect(screen.getByText('JuniorDev99')).toBeInTheDocument();
  });

  it('shows the relative date so the user knows how fresh the content is', () => {
    render(<VideoCard video={mockVideo} />);
    expect(screen.getByText('Hace 2 meses')).toBeInTheDocument();
  });

  it('shows hype level with 4 decimals for precise comparison between videos', () => {
    render(<VideoCard video={mockVideo} />);
    expect(screen.getByText('0.0519')).toBeInTheDocument();
  });

  it('renders the thumbnail with descriptive alt text for accessibility', () => {
    render(<VideoCard video={mockVideo} />);
    const img = screen.getByAltText('AWS explicado fácil');
    expect(img).toHaveAttribute('src', mockVideo.thumbnail);
  });

  it('does NOT show the crown badge — this is a regular card, not the crown jewel', () => {
    render(<VideoCard video={mockVideo} />);
    expect(screen.queryByText('Joya de la Corona')).not.toBeInTheDocument();
    expect(screen.queryByText('Crown Jewel')).not.toBeInTheDocument();
  });
});
