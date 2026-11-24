"use client";

import { useState } from "react";
import styles from "./flip-card.module.css";

type IconName = "memory" | "ai" | "cloud" | "radar" | "alert" | "location" | "history" | "vehicle" | "fingerprint";

type FlipCardProps = {
  icon: IconName;
  title: string;
  text: string;
  backTitle: string;
  backText: string;
  label?: string;
  hideTitle?: boolean;
};

function CardIcon({ name }: { name: IconName }) {
  const icons: Record<IconName, React.ReactNode> = {
    memory: <><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 14h3M20 9h3M20 14h3M10 10h4v4h-4z" /></>,
    ai: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>,
    cloud: <><path d="M7.5 18h9.2a4.3 4.3 0 0 0 .5-8.5A6 6 0 0 0 5.7 8.2 4.5 4.5 0 0 0 7.5 18Z" /><path d="M12 11v6M9.5 14l2.5-3 2.5 3" /></>,
    radar: <><circle cx="12" cy="12" r="8" /><path d="M12 12 18 6M12 4v2M12 18v2M4 12h2M18 12h2" /></>,
    alert: <><path d="m12 4 8 15H4L12 4Z" /><path d="M12 9v4M12 16v.1" /></>,
    location: <><path d="M19 10c0 5-7 10-7 10S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2" /></>,
    history: <><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.5" /><path d="M4 4v4.5h4.5M12 8v4l2.5 1.5" /></>,
    vehicle: <><path d="M4 15v-4l2-5h12l2 5v4M4 15h16M7 15v2M17 15v2" /><circle cx="7" cy="14" r="1" /><circle cx="17" cy="14" r="1" /></>,
    fingerprint: <path d="M8 11a4 4 0 0 1 8 0v2M6 11a6 6 0 0 1 12 0v3M10 11a2 2 0 0 1 4 0v5M4 11a8 8 0 0 1 16 0v2M8 17c.8 1.5 2 2.5 4 3M16 17c-.3 1-.8 2-1.5 2.7" />,
  };
  return <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">{icons[name]}</svg>;
}

export default function FlipCard({ icon, title, text, backTitle, backText, label, hideTitle }: FlipCardProps) {
  const [flipped, setFlipped] = useState(false);
  const toggle = () => setFlipped((current) => !current);

  return (
    <article className={`${styles.card} ${flipped ? styles.isFlipped : ""}`} onClick={toggle} onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggle(); }
    }} role="button" tabIndex={0} aria-pressed={flipped} aria-label={`${title}. ${flipped ? "Mostrar resumen" : "Mostrar detalle"}`}>
      <div className={styles.cardInner}>
        <div className={styles.cardFace}>
          <div className={styles.cardTop}><span className={styles.iconBox}><CardIcon name={icon} /></span>{label && <span className={styles.badge}>{label}</span>}</div>
          {!hideTitle && <h3>{title}</h3>}<p>{text}</p><span className={styles.hint}>Ver detalle</span>
        </div>
        <div className={`${styles.cardFace} ${styles.cardBack}`}>
          <span className={styles.backKicker}>{backTitle}</span><p>{backText}</p>
          <button type="button" className={styles.backButton} onClick={(event) => { event.stopPropagation(); setFlipped(false); }}>Volver al resumen</button>
        </div>
      </div>
    </article>
  );
}
