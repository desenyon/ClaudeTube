import styles from "../styles/app.module.css";
import { formatDuration } from "../lib/thumbnail";

interface NowPlayingProps {
  title?: string;
  thumbnailUrl?: string;
  videoId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onCopyUrl: () => void;
  onOpenExternal: () => void;
}

export function NowPlaying({
  title,
  thumbnailUrl,
  videoId,
  isPlaying,
  currentTime,
  duration,
  onCopyUrl,
  onOpenExternal,
}: NowPlayingProps) {
  if (!videoId) {
    return null;
  }

  return (
    <div className={styles.nowPlayingCard}>
      {thumbnailUrl && (
        <img className={styles.nowPlayingThumb} src={thumbnailUrl} alt="" />
      )}
      <div className={styles.nowPlayingMeta}>
        <p className={styles.nowPlayingTitle}>{title ?? videoId}</p>
        <p className={styles.nowPlayingSub}>
          {isPlaying ? "Playing" : "Paused"} · {formatDuration(currentTime)}
          {duration > 0 ? ` / ${formatDuration(duration)}` : ""}
        </p>
        <div className={styles.nowPlayingActions}>
          <button type="button" className={styles.ghostButton} onClick={onCopyUrl}>
            Copy URL
          </button>
          <button type="button" className={styles.ghostButton} onClick={onOpenExternal}>
            Browser
          </button>
        </div>
      </div>
    </div>
  );
}
