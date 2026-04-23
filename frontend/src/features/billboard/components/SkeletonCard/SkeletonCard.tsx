import styles from './SkeletonCard.module.css';

export function SkeletonCard() {
  return (
    <div className={styles.card} data-testid="skeleton-card" aria-hidden="true">
      <div className={styles.thumbnail} />
      <div className={styles.content}>
        <div className={`${styles.line} ${styles.title}`} />
        <div className={`${styles.line} ${styles.titleShort}`} />
        <div className={`${styles.line} ${styles.author}`} />
        <div className={`${styles.line} ${styles.date}`} />
        <div className={styles.badge} />
      </div>
    </div>
  );
}

export function SkeletonCrown() {
  return (
    <div className={styles.crown} data-testid="skeleton-crown" aria-hidden="true">
      <div className={styles.crownInner}>
        <div className={styles.crownThumb} />
        <div className={styles.crownContent}>
          <div className={`${styles.line} ${styles.crownTitle}`} />
          <div className={`${styles.line} ${styles.crownTitleShort}`} />
          <div className={`${styles.line} ${styles.author}`} />
          <div className={`${styles.line} ${styles.date}`} />
          <div className={styles.crownScore} />
        </div>
      </div>
    </div>
  );
}
