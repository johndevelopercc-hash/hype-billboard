import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Video } from '../../types';
import { useCountUp } from '../../../../shared/hooks/useCountUp';
import { useConfetti } from '../../../../shared/hooks/useConfetti';
import styles from './CrownCard.module.css';

interface CrownCardProps {
  video: Video;
}

export function CrownCard({ video }: CrownCardProps) {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);
  const animatedHype = useCountUp(video.hypeLevel);
  const { ref } = useConfetti();

  return (
    <article className={styles.crown} data-testid="crown-card" ref={ref}>
      <div className={styles.badge}>
        <span className={styles.crownIcon}>👑</span>
        {t('card.crownBadge')}
      </div>
      <div className={styles.inner}>
        <div className={styles.thumbnailWrapper}>
          <div className={styles.imgFallback} aria-hidden="true">
            <span>{video.title.charAt(0)}</span>
          </div>
          <img
            src={video.thumbnail}
            alt={video.title}
            className={`${styles.thumbnail} ${imgError ? styles.thumbnailHidden : ''}`}
            onError={() => setImgError(true)}
          />
          <div className={styles.overlay} />
        </div>
        <div className={styles.content}>
          <h2 className={styles.title}>{video.title}</h2>
          <p className={styles.author}>
            {t('card.by')} <span>{video.author}</span>
          </p>
          <p className={styles.date}>{video.publishedAt}</p>
          <div className={styles.hypeDisplay}>
            <span className={styles.hypeLabel}>{t('card.hypeLevel')}</span>
            <span className={styles.hypeValue}>{animatedHype.toFixed(4)}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
