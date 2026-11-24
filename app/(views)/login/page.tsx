import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import AuthPanelQuery from "./auth-panel-query";
import styles from "./page.module.css";
import { LegalLinks } from "../legal/components/LegalLinks";

export const metadata: Metadata = {
  title: "Acceso corporativo | SIGILIA",
  description: "Inicio de sesión, registro de administrador y enrolamiento MFA de SIGILIA.",
};

export default function LoginPage() {
  return <main className={styles.page} data-theme-surface>
    <header className={styles.header}><div className={styles.logoLink} aria-label="SIGILIA"><Image src="/logo-sigilia-original.png" alt="SIGILIA" width={2560} height={960} priority /></div></header>
    <div className={styles.layout}>
      <section className={styles.assurance}><span className={styles.kicker}>Autenticación multifactor</span><h1><span className={styles.titleAccent}>Control seguro</span> para tu operación.</h1><p>El acceso combina contraseña y un segundo factor facial procesado en el navegador o códigos TOTP de una aplicación autenticadora.</p><div className={styles.assuranceFoot}><span className={styles.statusDot} /> Portal administrativo SIGILIA</div></section>
      <Suspense fallback={<div className={styles.panel} role="status">Cargando acceso…</div>}>
        <AuthPanelQuery />
      </Suspense>
    </div>
    <footer className={styles.footer}><span>© 2025 SIGILIA</span><span>Acceso restringido a personal autorizado</span><LegalLinks /><a href="/informativo">Volver al portal informativo</a></footer>
  </main>;
}
