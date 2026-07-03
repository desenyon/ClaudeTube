import { useMemo, useState } from "react";
import styles from "../styles/app.module.css";
import type { HistoryItem, QueueItem } from "../lib/types";
import { thumbnailUrlForVideo } from "../lib/thumbnail";

interface VideoListProps {
  title: string;
  items: QueueItem[] | HistoryItem[];
  emptyLabel: string;
  onSelect: (item: QueueItem | HistoryItem) => void;
  onRemove?: (videoId: string) => void;
  showTimestamp?: boolean;
  searchable?: boolean;
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
  searchable = false,
}: VideoListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) {
      return items;
    }
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.title?.toLowerCase().includes(q) ||
        item.videoId.toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <section className={styles.listSection}>
      <div className={styles.listHeader}>
        <h3>{title}</h3>
        <span className={styles.badge}>{items.length}</span>
      </div>
      {searchable && items.length > 0 && (
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Search..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      )}
      {filtered.length === 0 ? (
        <p className={styles.emptyLabel}>{items.length === 0 ? emptyLabel : "No matches"}</p>
      ) : (
        <ul className={styles.videoList}>
          {filtered.map((item) => {
            const ts = "addedAt" in item ? item.addedAt : item.watchedAt;
            const thumb = item.thumbnailUrl ?? thumbnailUrlForVideo(item.videoId);
            return (
              <li key={`${item.videoId}-${ts}`} className={styles.videoListItem}>
                <button
                  type="button"
                  className={styles.videoListButton}
                  onClick={() => onSelect(item)}
                >
                  <img className={styles.videoListThumb} src={thumb} alt="" />
                  <span className={styles.videoListText}>
                    <span className={styles.videoListTitle}>
                      {item.title ?? item.videoId}
                    </span>
                    {showTimestamp && (
                      <span className={styles.videoListMeta}>
                        {formatRelativeTime(ts)}
                      </span>
                    )}
                  </span>
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
