import Link from "next/link";
import styles from "./legal-links.module.css";

export function LegalLinks() {
  return (
    <nav className={styles.links} aria-label="Información legal">
      <Link href="/legal/privacidad">Aviso de privacidad</Link>
      <Link href="/legal/arco">Solicitud ARCO</Link>
    </nav>
  );
}
