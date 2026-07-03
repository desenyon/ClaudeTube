import { forwardRef } from "react";
import styles from "../styles/app.module.css";

interface UrlBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export const UrlBar = forwardRef<HTMLInputElement, UrlBarProps>(function UrlBar(
  {
    value,
    onChange,
    onSubmit,
    placeholder = "Paste YouTube URL, playlist, or video ID",
    disabled = false,
  },
  ref
) {
  return (
    <form
      className={styles.urlBar}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <input
        ref={ref}
        className={styles.urlInput}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        spellCheck={false}
      />
      <button className={styles.primaryButton} type="submit" disabled={disabled}>
        Play
      </button>
    </form>
  );
});
