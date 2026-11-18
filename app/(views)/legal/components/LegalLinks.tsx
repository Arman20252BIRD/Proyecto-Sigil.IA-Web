import Link from "next/link";
import styles from "./legal-links.module.css";
import { CookieSettingsLink } from "./cookies/CookieSettingsLink";

export function LegalLinks({ showCookieSettings = false }: { showCookieSettings?: boolean }) {
  return (
    <nav className={styles.links} aria-label="Información legal">
      <Link href="/legal/privacidad">Aviso de privacidad</Link>
      <Link href="/legal/cookies">Política de cookies</Link>
      <Link href="/legal/arco">Solicitud ARCO</Link>
      <Link href="/legal/terminos">
        Términos y condiciones
      </Link>
      {showCookieSettings && <CookieSettingsLink />}
    </nav>
  );
}
