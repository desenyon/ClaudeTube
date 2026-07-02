import styles from "../styles/app.module.css";
import type { LayoutMode } from "../lib/types";

const LAYOUTS: { id: LayoutMode; label: string }[] = [
  { id: "compact", label: "Compact" },
  { id: "theater", label: "Theater" },
  { id: "mini", label: "Mini" },
];

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

interface ControlsProps {
  layout: LayoutMode;
  onLayoutChange: (layout: LayoutMode) => void;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  muted: boolean;
  onMuteToggle: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  miniOpacity: number;
  onMiniOpacityChange: (opacity: number) => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  onEnqueue: () => void;
  hasVideo: boolean;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function Controls({
  layout,
  onLayoutChange,
  playbackRate,
  onPlaybackRateChange,
  volume,
  onVolumeChange,
  muted,
  onMuteToggle,
  isPlaying,
  onTogglePlay,
  miniOpacity,
  onMiniOpacityChange,
  currentTime,
  duration,
  onSeek,
  onEnqueue,
  hasVideo,
}: ControlsProps) {
  return (
    <div className={styles.controls}>
      <div className={styles.seekRow}>
        <span className={styles.timeLabel}>{formatTime(currentTime)}</span>
        <input
          className={styles.seekSlider}
          type="range"
          min={0}
          max={duration || 0}
          step={1}
          value={Math.min(currentTime, duration || 0)}
          disabled={!hasVideo || !duration}
          onChange={(event) => onSeek(Number(event.target.value))}
        />
        <span className={styles.timeLabel}>{formatTime(duration)}</span>
      </div>

      <div className={styles.controlRow}>
        <button
          type="button"
          className={styles.controlButton}
          onClick={onTogglePlay}
          disabled={!hasVideo}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>

        <button
          type="button"
          className={styles.controlButton}
          onClick={onMuteToggle}
          disabled={!hasVideo}
        >
          {muted ? "Unmute" : "Mute"}
        </button>

        <label className={styles.inlineControl}>
          Vol
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            disabled={!hasVideo}
            onChange={(event) => onVolumeChange(Number(event.target.value))}
          />
        </label>

        <label className={styles.inlineControl}>
          Speed
          <select
            value={playbackRate}
            disabled={!hasVideo}
            onChange={(event) =>
              onPlaybackRateChange(Number(event.target.value))
            }
          >
            {SPEEDS.map((speed) => (
              <option key={speed} value={speed}>
                {speed}x
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className={styles.controlButton}
          onClick={onEnqueue}
          disabled={!hasVideo}
        >
          + Queue
        </button>
      </div>

      <div className={styles.controlRow}>
        <div className={styles.segmented}>
          {LAYOUTS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                layout === item.id
                  ? `${styles.segmentButton} ${styles.segmentActive}`
                  : styles.segmentButton
              }
              onClick={() => onLayoutChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {layout === "mini" && (
          <label className={styles.inlineControl}>
            Opacity
            <input
              type="range"
              min={0.3}
              max={1}
              step={0.05}
              value={miniOpacity}
              onChange={(event) =>
                onMiniOpacityChange(Number(event.target.value))
              }
            />
          </label>
        )}
      </div>
    </div>
  );
}
