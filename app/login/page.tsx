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
    <header className={styles.header}><a href="/informativo" className={styles.logoLink}><Image src="/sigil-logo.png" alt="Sigil.IA" width={180} height={120} priority /></a><span className={styles.secureBadge}><i /> Conexión segura · TLS 1.3</span></header>
    <div className={styles.layout}>
      <section className={styles.assurance}><span className={styles.kicker}>Autenticación multifactor</span><h1>Control seguro para tu operación.</h1><p>El acceso administrativo combina credenciales institucionales con verificación facial para proteger la telemetría y los dispositivos de tu flota.</p><div className={styles.assuranceList}><div><b>01</b><span><strong>Identidad corporativa</strong><small>Correo y teléfono de recuperación verificados.</small></span></div><div><b>02</b><span><strong>Enrolamiento facial</strong><small>La captura se prepara para una firma biométrica cifrada.</small></span></div><div><b>03</b><span><strong>Reto MFA</strong><small>El rostro vuelve a validarse antes de entrar al dashboard.</small></span></div></div><div className={styles.assuranceFoot}><span className={styles.statusDot} /> Portal administrativo Sigil.IA</div></section>
      <AuthPanel />
    </div>
    <footer className={styles.footer}><span>© 2025 Sigil.IA</span><span>Acceso restringido a personal autorizado</span><a href="/informativo">Volver al portal informativo</a></footer>
  </main>;
}
