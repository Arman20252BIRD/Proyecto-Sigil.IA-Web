import type { Metadata } from "next";
import Image from "next/image";
import AuthPanel from "./auth-panel";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Acceso corporativo | Sigil.IA",
  description: "Inicio de sesión, registro de administrador y enrolamiento MFA de Sigil.IA.",
};

export default function LoginPage() {
  return <main className={styles.page}>
    <header className={styles.header}><a href="/informativo" className={styles.logoLink}><Image src="/sigil-logo.png" alt="Sigil.IA" width={180} height={120} priority /></a><span className={styles.secureBadge}><i /> MFA · plantillas cifradas</span></header>
    <div className={styles.layout}>
      <section className={styles.assurance}><span className={styles.kicker}>Autenticación multifactor</span><h1>Control seguro para tu operación.</h1><p>El acceso combina contraseña y un segundo factor facial procesado en el navegador o códigos TOTP de una aplicación autenticadora.</p><div className={styles.assuranceList}><div><b>01</b><span><strong>Modelos locales</strong><small>El análisis facial se ejecuta en el navegador; no se suben fotografías.</small></span></div><div><b>02</b><span><strong>Plantilla cifrada</strong><small>El descriptor se cifra en el backend antes de guardarse en PostgreSQL.</small></span></div><div><b>03</b><span><strong>Alternativa TOTP</strong><small>Usa una aplicación autenticadora si no puedes verificar tu rostro.</small></span></div></div><div className={styles.assuranceFoot}><span className={styles.statusDot} /> Portal administrativo Sigil.IA</div></section>
      <AuthPanel />
    </div>
    <footer className={styles.footer}><span>© 2025 Sigil.IA</span><span>Acceso restringido a personal autorizado</span><a href="/informativo">Volver al portal informativo</a></footer>
  </main>;
}
