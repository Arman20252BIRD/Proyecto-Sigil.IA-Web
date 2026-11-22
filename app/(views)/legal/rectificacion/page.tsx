import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import styles from "../arco/page.module.css";
import RectificationReview from "./rectification-review";

export const metadata: Metadata = {
  title: "Revisión de rectificación | Sigil.IA",
  description: "Autoriza o rechaza una solicitud de rectificación de datos personales.",
};

export default function RectificationReviewPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/informativo" className={styles.brand} aria-label="Sigil.IA">Sigil.IA</Link>
      </header>
      <section className={styles.card}>
        <span className={styles.kicker}>SOPORTE · DERECHOS ARCO</span>
        <h1>Revisión de rectificación</h1>
        <Suspense fallback={<p>Cargando solicitud…</p>}>
          <RectificationReview />
        </Suspense>
      </section>
    </main>
  );
}
