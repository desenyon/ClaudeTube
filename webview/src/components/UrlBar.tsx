import styles from "../styles/app.module.css";

interface UrlBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function UrlBar({
  value,
  onChange,
  onSubmit,
  placeholder = "Paste YouTube URL or video ID",
  disabled = false,
}: UrlBarProps) {
  return (
    <form
      className={styles.urlBar}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <input
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
}
