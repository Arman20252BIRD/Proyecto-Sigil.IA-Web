import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import styles from "./page.module.css";
import ArcoForm from "./arco-form";
import GmailStatus from "./gmail-status";

export const metadata: Metadata = {
  title: "Solicitud ARCO | Sigil.IA",
  description: "Solicita acceso, rectificación, cancelación u oposición de tus datos personales.",
};

export default function ArcoPage() {
  return <main className={styles.page}>
    <header className={styles.header}><Link href="/informativo" className={styles.brand} aria-label="Sigil.IA"><Image src="/logo-sigil-transparente.png" alt="Sigil.IA" width={190} height={90} priority /></Link><Link href="/legal/privacidad">Leer aviso de privacidad</Link></header>
    <section className={styles.card}>
      <span className={styles.kicker}>DERECHOS ARCO</span>
      <h1>Solicitud de datos personales</h1>
      <p>Usa este formulario para solicitar acceso, rectificación, cancelación u oposición al tratamiento de tus datos.</p>
      <Suspense fallback={null}><GmailStatus /></Suspense>
      <ArcoForm />
      <a className={styles.download} href="/legal/formato-solicitud-arco.pdf" download>Descargar formato ARCO PDF</a>
    </section>
  </main>;
}
