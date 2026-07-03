import { useEffect } from "react";
import styles from "../styles/app.module.css";

interface CollapsibleSectionProps {
  title: string;
  badge?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({
  title,
  badge,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  useEffect(() => {
    // defaultOpen only used for initial render via details element
  }, []);

  return (
    <details className={styles.collapsible} open={defaultOpen}>
      <summary className={styles.collapsibleSummary}>
        <span>{title}</span>
        {badge !== undefined && <span className={styles.badge}>{badge}</span>}
      </summary>
      <div className={styles.collapsibleBody}>{children}</div>
    </details>
  );
}
