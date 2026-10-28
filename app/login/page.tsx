import type { Metadata } from "next";
import Image from "next/image";
import AuthPanel from "./auth-panel";
import styles from "./page.module.css";
import { Preferences } from "../preferences";

export const metadata: Metadata = {
  title: "Acceso corporativo | Sigil.IA",
  description: "Inicio de sesión, registro de administrador y enrolamiento MFA de Sigil.IA.",
};

export default function LoginPage() {
  return <main className={styles.page}>
    <header className={styles.header}><div className={styles.logoLink} aria-label="Sigil.IA"><Image src="/logo-sigil-transparente.png" alt="Sigil.IA" width={180} height={120} priority /></div><Preferences inHeader /></header>
    <div className={styles.layout}>
      <section className={styles.assurance}><span className={styles.kicker}>Autenticación multifactor</span><h1>Control seguro para tu operación.</h1><p>El acceso combina contraseña y un segundo factor facial procesado en el navegador o códigos TOTP de una aplicación autenticadora.</p><div className={styles.assuranceFoot}><span className={styles.statusDot} /> Portal administrativo Sigil.IA</div></section>
      <AuthPanel />
    </div>
    <footer className={styles.footer}><span>© 2025 Sigil.IA</span><span>Acceso restringido a personal autorizado</span><a href="/informativo">Volver al portal informativo</a></footer>
  </main>;
}
