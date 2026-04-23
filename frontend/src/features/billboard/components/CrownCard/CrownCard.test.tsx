import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CrownCard } from './CrownCard';
import type { Video } from '../../types';

// useCountUp is a visual-only animation — return the target immediately in tests.
vi.mock('../../../../shared/hooks/useCountUp', () => ({
  useCountUp: (target: number) => target,
}));

// Explicit i18n mock — tests must not depend on global i18n initialization order.
// We test component behavior, not translation infrastructure.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'card.crownBadge': 'Joya de la Corona',
      'card.by': 'por',
      'card.hypeLevel': 'Nivel de Hype',
    }[key] ?? key),
  }),
}));

const crownVideo: Video = {
  id: 'vid_003',
  title: 'TailwindCSS errores comunes - Tutorial',
  author: 'JuniorDev99',
  thumbnail: 'https://via.placeholder.com/300x200',
  publishedAt: 'Hace 2 años',
  hypeLevel: 0.3079,
  isCrown: true,
};

describe('CrownCard — crown jewel distinguishing behavior', () => {
  it('prominently displays the crown badge so users immediately spot the top video', () => {
    render(<CrownCard video={crownVideo} />);
    expect(screen.getByText('Joya de la Corona')).toBeInTheDocument();
  });

  it('shows the video title clearly in the featured area', () => {
    render(<CrownCard video={crownVideo} />);
    expect(screen.getByText('TailwindCSS errores comunes - Tutorial')).toBeInTheDocument();
  });

  it('shows the channel author for attribution', () => {
    render(<CrownCard video={crownVideo} />);
    expect(screen.getByText('JuniorDev99')).toBeInTheDocument();
  });

  it('shows the hype score prominently — this is the key metric of the billboard', () => {
    render(<CrownCard video={crownVideo} />);
    expect(screen.getByText('0.3079')).toBeInTheDocument();
  });

  it('renders the thumbnail with correct alt text for accessibility', () => {
    render(<CrownCard video={crownVideo} />);
    const img = screen.getByAltText('TailwindCSS errores comunes - Tutorial');
    expect(img).toHaveAttribute('src', crownVideo.thumbnail);
  });

  it('shows the relative publication date', () => {
    render(<CrownCard video={crownVideo} />);
    expect(screen.getByText('Hace 2 años')).toBeInTheDocument();
  });

  it('shows image fallback with first letter when thumbnail fails', async () => {
    render(<CrownCard video={{ ...crownVideo, thumbnail: 'broken-url' }} />);
    const img = screen.getByAltText('TailwindCSS errores comunes - Tutorial');
    img.dispatchEvent(new Event('error'));
    // After the error the fallback letter should appear
    expect(await screen.findByText('T')).toBeInTheDocument();
  });
});
