import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useVideos } from './features/billboard/hooks/useVideos';
import { CrownCard } from './features/billboard/components/CrownCard/CrownCard';
import { VideoCard } from './features/billboard/components/VideoCard/VideoCard';
import { SkeletonCard, SkeletonCrown } from './features/billboard/components/SkeletonCard/SkeletonCard';
import { useTheme } from './shared/hooks/useTheme';
import { useConfetti } from './shared/hooks/useConfetti';
import type { SortOption, LangOption } from './features/billboard/types';
import './shared/i18n';
import './App.css';

export default function App() {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [sort, setSort] = useState<SortOption>('hype');
  const [lang, setLang] = useState<LangOption>('es');
  const { fire } = useConfetti();

  // Press H anywhere to celebrate the Hype
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === 'h' || e.key === 'H') fire();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fire]);

  const { videos, loading, error, refetch } = useVideos({ sort, lang });

  const crownVideo = videos.find((v) => v.isCrown);
  const restVideos = videos.filter((v) => !v.isCrown);

  const toggleLang = () => {
    const next: LangOption = lang === 'es' ? 'en' : 'es';
    setLang(next);
    i18n.changeLanguage(next);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="branding">
            <h1 className="app-title">{t('app.title')}</h1>
            <p className="app-subtitle">{t('app.subtitle')}</p>
          </div>
          <div className="controls">
            <div className="control-group">
              <label htmlFor="sort-select">{t('controls.sortLabel')}</label>
              <select
                id="sort-select"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
              >
                <option value="hype">{t('controls.sortHype')}</option>
                <option value="date">{t('controls.sortDate')}</option>
              </select>
            </div>

            <button
              className="icon-btn"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? t('controls.themeLight') : t('controls.themeDark')}
              title={theme === 'dark' ? t('controls.themeLight') : t('controls.themeDark')}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            <button
              className="icon-btn"
              onClick={toggleLang}
              aria-label="Switch language"
            >
              {lang === 'es' ? '🇬🇧 EN' : '🇪🇸 ES'}
            </button>
          </div>
        </div>
      </header>

      <main className="main">
        {loading && (
          <div className="grid" data-testid="loading-state">
            <SkeletonCrown />
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="state-container error" data-testid="error-state">
            <p>⚠️ {t('states.error')}</p>
            <button className="retry-btn" onClick={refetch}>
              {t('states.errorRetry')}
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="grid">
            {crownVideo && <CrownCard video={crownVideo} />}
            {restVideos.map((video, i) => (
              <VideoCard key={video.id} video={video} index={i} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
