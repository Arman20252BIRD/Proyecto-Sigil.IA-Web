import Image from "next/image";
import Link from "next/link";
import { LegalLinks } from "../legal/components/LegalLinks";
import styles from "./public-header.module.css";

export function PublicHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link className={styles.logo} href="/informativo" aria-label="Ir al inicio de SIGILIA">
          <Image src="/logo-sigilia-original.png" alt="SIGILIA" width={2560} height={960} priority />
        </Link>
        <nav className={styles.nav} aria-label="Navegación principal">
          <Link href="/informativo">Inicio</Link>
          <Link href="/servicios">Servicios</Link>
          <Link href="/precios">Precios</Link>
          <Link href="/sobre-nosotros">Sobre nosotros</Link>
        </nav>
        <div className={styles.actions}>
          <Link className={styles.demo} href="/cotizar">Solicitar demo</Link>
          <Link className={styles.login} href="/login">Iniciar sesión</Link>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerMain}>
        <div className={styles.footerIdentity}>
          <Link className={styles.footerBrand} href="/informativo" aria-label="Ir al inicio de SIGILIA">
            <Image src="/logo-sigilia-original.png" alt="SIGILIA" width={2560} height={960} />
          </Link>
          <p>© 2026 SIGILIA. Todos los derechos reservados.</p>
        </div>
        <div className={styles.footerContactInfo}>
          <strong>Contacto</strong>
          <a href="mailto:ventas@sigilia.com.mx">ventas@sigilia.com.mx</a>
          <a href="mailto:soporte@sigilia.com.mx">soporte@sigilia.com.mx</a>
        </div>
        <div className={styles.footerContactInfo}>
          <strong>Atención</strong>
          <span>Mérida, Yucatán, México</span>
          <span>Lunes a viernes · 9:00 a 18:00 h</span>
        </div>
      </div>
      <div className={styles.footerBottom}>
        <div className={styles.footerRight}><LegalLinks /></div>
      </div>
    </footer>
  );
}
