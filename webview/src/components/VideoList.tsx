import styles from "../styles/app.module.css";
import type { HistoryItem, QueueItem } from "../lib/types";

interface VideoListProps {
  title: string;
  items: QueueItem[] | HistoryItem[];
  emptyLabel: string;
  onSelect: (item: QueueItem | HistoryItem) => void;
  onRemove?: (videoId: string) => void;
  showTimestamp?: boolean;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function VideoList({
  title,
  items,
  emptyLabel,
  onSelect,
  onRemove,
  showTimestamp = false,
}: VideoListProps) {
  return (
    <section className={styles.listSection}>
      <div className={styles.listHeader}>
        <h3>{title}</h3>
        <span className={styles.badge}>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className={styles.emptyLabel}>{emptyLabel}</p>
      ) : (
        <ul className={styles.videoList}>
          {items.map((item) => {
            const ts =
              "addedAt" in item ? item.addedAt : item.watchedAt;
            return (
              <li key={`${item.videoId}-${ts}`} className={styles.videoListItem}>
                <button
                  type="button"
                  className={styles.videoListButton}
                  onClick={() => onSelect(item)}
                >
                  <span className={styles.videoListTitle}>
                    {item.title ?? item.videoId}
                  </span>
                  {showTimestamp && (
                    <span className={styles.videoListMeta}>
                      {formatRelativeTime(ts)}
                    </span>
                  )}
                </button>
                {onRemove && (
                  <button
                    type="button"
                    className={styles.iconButton}
                    aria-label="Remove"
                    onClick={() => onRemove(item.videoId)}
                  >
                    ×
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
