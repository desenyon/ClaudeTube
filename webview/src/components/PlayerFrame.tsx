import styles from "../styles/app.module.css";

interface PlayerFrameProps {
  containerId: string;
  layout: "compact" | "theater" | "mini";
  miniOpacity: number;
  hasVideo: boolean;
  error: string | null;
  onOpenExternal?: () => void;
}

export function PlayerFrame({
  containerId,
  layout,
  miniOpacity,
  hasVideo,
  error,
  onOpenExternal,
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
        <div id={containerId} className={styles.playerMount} />
      ) : (
        <div className={styles.playerPlaceholder}>
          <p>Paste a YouTube URL to start watching</p>
        </div>
      )}

      {error && (
        <div className={styles.playerError}>
          <p>{error}</p>
          {onOpenExternal && (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onOpenExternal}
            >
              Open in browser
            </button>
          )}
        </div>
      )}
    </div>
  );
}
