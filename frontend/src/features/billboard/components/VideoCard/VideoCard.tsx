import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Video } from '../../types';
import styles from './VideoCard.module.css';

interface VideoCardProps {
  video: Video;
  index?: number;
}

export function VideoCard({ video, index = 0 }: VideoCardProps) {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);

  return (
    <article
      className={styles.card}
      data-testid="video-card"
      style={{ '--card-index': index } as React.CSSProperties}
    >
      <div className={styles.thumbnailWrapper}>
        {/* Fallback is always in the DOM — visible beneath the image.
            When the image loads it covers the fallback. When it errors
            the image is hidden and the fallback is already there — no flash. */}
        <div className={styles.imgFallback} aria-hidden="true">
          <span>{video.title.charAt(0)}</span>
        </div>
        <img
          src={video.thumbnail}
          alt={video.title}
          className={`${styles.thumbnail} ${imgError ? styles.thumbnailHidden : ''}`}
          loading="lazy"
          onError={() => setImgError(true)}
        />
      </div>
      <div className={styles.content}>
        <h3 className={styles.title} title={video.title}>
          {video.title}
        </h3>
        <p className={styles.author}>
          {t('card.by')} <span>{video.author}</span>
        </p>
        <p className={styles.date}>{video.publishedAt}</p>
        <div className={styles.hypeBadge}>
          <span className={styles.hypeLabel}>{t('card.hypeLevel')}</span>
          <span className={styles.hypeValue}>{video.hypeLevel.toFixed(4)}</span>
        </div>
      </div>
    </article>
  );
}
