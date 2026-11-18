"use client";

import styles from "../legal-links.module.css";

export function CookieSettingsLink() {
  return (
    <button
      type="button"
      className={styles.settingsLink}
      onClick={() => window.dispatchEvent(new Event("sigil:open-cookie-settings"))}
    >
      Configurar cookies
    </button>
  );
}
