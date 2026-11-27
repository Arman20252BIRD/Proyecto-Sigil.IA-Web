import { Suspense } from "react";
import type { Metadata } from "next";
import AuthPanelQuery from "./auth-panel-query";
import styles from "./page.module.css";
import { PublicFooter, PublicHeader } from "../components/public-header";

export const metadata: Metadata = {
  title: "Acceso corporativo | Sigilia",
  description: "Inicio de sesión, registro de administrador y enrolamiento MFA de Sigilia.",
};

export default function LoginPage() {
  return <main className={styles.page} data-theme-surface>
    <PublicHeader />
    <div className={styles.layout}>
      <Suspense fallback={<div className={styles.panel} role="status">Cargando acceso…</div>}>
        <AuthPanelQuery />
      </Suspense>
    </div>
    <PublicFooter />
  </main>;
}
