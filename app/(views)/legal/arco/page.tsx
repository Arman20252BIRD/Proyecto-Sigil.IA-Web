import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import styles from "./page.module.css";
import ArcoForm from "./arco-form";
import GmailStatus from "./gmail-status";

export const metadata: Metadata = {
  title: "Solicitud ARCO | Sigilia",
  description: "Solicita acceso, rectificación o cancelación de tus datos personales.",
};

export default function ArcoPage() {
  return <main className={styles.page}>
    <header className={styles.header}><Link href="/informativo" className={styles.brand} aria-label="Sigilia"><Image src="/logo-sigilia-original.png" alt="Sigilia" width={2560} height={960} priority /></Link></header>
    <section className={styles.card}>
      <span className={styles.kicker}>DERECHOS ARCO</span>
      <h1>Solicitud de datos personales</h1>
      <p>Usa este formulario para solicitar acceso, rectificación o cancelación de tus datos personales.</p>
      <Suspense fallback={null}><GmailStatus /></Suspense>
      <ArcoForm />
      <div className={styles.backHomeWrap}>
        <Link href="/informativo" className={styles.backHome}>Volver al inicio</Link>
      </div>
    </section>
  </main>;
}
