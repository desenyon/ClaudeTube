import styles from "../styles/app.module.css";

interface PlayerFrameProps {
  containerId: string;
  layout: "compact" | "theater" | "mini";
  miniOpacity: number;
  hasVideo: boolean;
  isLoading?: boolean;
  error: string | null;
  onOpenExternal?: () => void;
  onRetry?: () => void;
}

export function PlayerFrame({
  containerId,
  layout,
  miniOpacity,
  hasVideo,
  isLoading = false,
  error,
  onOpenExternal,
  onRetry,
}: PlayerFrameProps) {
  const layoutClass =
    layout === "theater"
      ? styles.playerTheater
      : layout === "mini"
        ? styles.playerMini
        : styles.playerCompact;

  return (
    <div
      className={`${styles.playerShell} ${layoutClass}`}
      style={layout === "mini" ? { opacity: miniOpacity } : undefined}
    >
      {hasVideo ? (
        <>
          <div id={containerId} className={styles.playerMount} />
          {isLoading && (
            <div className={styles.playerLoading}>
              <span className={styles.spinner} />
              Loading...
            </div>
          )}
        </>
      ) : (
        <div className={styles.playerPlaceholder}>
          <p className={styles.placeholderTitle}>Ready when you are</p>
          <p className={styles.placeholderHint}>Paste a YouTube URL above</p>
        </div>
      )}

      {error && (
        <div className={styles.playerError}>
          <p>{error}</p>
          <div className={styles.errorActions}>
            {onRetry && (
              <button type="button" className={styles.secondaryButton} onClick={onRetry}>
                Retry
              </button>
            )}
            {onOpenExternal && (
              <button type="button" className={styles.secondaryButton} onClick={onOpenExternal}>
                Open in browser
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
