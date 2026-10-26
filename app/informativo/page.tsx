import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Sigil.IA | Seguridad inteligente para flotas",
  description:
    "Conoce la plataforma de seguridad para flotas basada en edge computing, inferencia inteligente y AWS.",
};

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h11M10.5 5.5 15 10l-4.5 4.5" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m7.5 5 6 5-6 5V5Z" />
    </svg>
  );
}

function SignalIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 19v-2M8 19v-5M12 19v-8M16 19V7M20 19V4" />
    </svg>
  );
}

function CpuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3M10 10h4v4h-4z" />
    </svg>
  );
}

function CloudIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.5 18h9.25a4.25 4.25 0 0 0 .45-8.48A6 6 0 0 0 5.72 8.2 4.5 4.5 0 0 0 7.5 18Z" />
      <path d="M12 11v6M9.5 14l2.5-3 2.5 3" />
    </svg>
  );
}

export default function InformativoPage() {
  return (
    <main className={styles.page}>
      <nav className={styles.navbar} aria-label="Navegación principal">
        <Link className={styles.brand} href="/informativo" aria-label="Sigil.IA inicio">
          <span className={styles.brandMark}>S</span>
          <span>sigil<span className={styles.brandDot}>.</span>ia</span>
        </Link>

        <div className={styles.navLinks}>
          <a href="#proyecto">El proyecto</a>
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#funciones">Funciones</a>
        </div>

        <div className={styles.navActions}>
          <Link className={styles.loginLink} href="/login">Iniciar sesión</Link>
          <Link className={styles.corporateButton} href="/login?tipo=corporativo">
            Acceso corporativo <ArrowIcon />
          </Link>
        </div>
      </nav>

      <section className={styles.hero} id="proyecto">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><span /> Fleet security platform</p>
          <h1>La seguridad de tu flota, <em>más inteligente.</em></h1>
          <p className={styles.heroText}>
            Sigil.IA combina procesamiento en el borde, inteligencia artificial y la potencia de AWS para proteger cada trayecto en tiempo real.
          </p>
          <div className={styles.heroActions}>
            <a className={styles.primaryButton} href="#como-funciona">Conoce el sistema <ArrowIcon /></a>
            <a className={styles.playButton} href="#como-funciona"><span><PlayIcon /></span> Cómo funciona</a>
          </div>
          <div className={styles.trustLine}><span className={styles.pulse} /> Monitoreo activo en cada viaje</div>
        </div>

        <div className={styles.heroVisual} aria-label="Esquema de arquitectura Sigil.IA">
          <div className={styles.glow} />
          <div className={styles.radar}>
            <div className={styles.radarRing} />
            <div className={styles.radarRingSmall} />
            <div className={styles.radarLine} />
            <div className={styles.radarCenter}><span>S</span></div>
            <div className={`${styles.dataPoint} ${styles.pointOne}`} />
            <div className={`${styles.dataPoint} ${styles.pointTwo}`} />
            <div className={`${styles.dataPoint} ${styles.pointThree}`} />
          </div>
          <div className={`${styles.visualLabel} ${styles.labelTop}`}><span>01</span> detección</div>
          <div className={`${styles.visualLabel} ${styles.labelBottom}`}><span>02</span> respuesta</div>
          <div className={styles.visualCaption}>EDGE / AI / CLOUD</div>
        </div>
      </section>

      <section className={styles.architecture} id="como-funciona">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}><span /> Arquitectura distribuida</p>
          <h2>De la señal a la decisión,<br /><em>en milisegundos.</em></h2>
          <p>La plataforma conecta el vehículo, la inteligencia local y la nube en un flujo seguro y continuo.</p>
        </div>
        <div className={styles.flow}>
          <article className={styles.flowCard}><div className={styles.iconBox}><CpuIcon /></div><span className={styles.cardNumber}>01</span><h3>Captura local</h3><p>El ESP32 recopila señales del vehículo sin depender de la conectividad.</p></article>
          <div className={styles.connector} aria-hidden="true">→</div>
          <article className={styles.flowCard}><div className={styles.iconBox}><SignalIcon /></div><span className={styles.cardNumber}>02</span><h3>Inferencia inteligente</h3><p>Los modelos detectan patrones de riesgo y generan alertas accionables.</p></article>
          <div className={styles.connector} aria-hidden="true">→</div>
          <article className={styles.flowCard}><div className={styles.iconBox}><CloudIcon /></div><span className={styles.cardNumber}>03</span><h3>Visibilidad en AWS</h3><p>La información se almacena y visualiza para tomar mejores decisiones.</p></article>
        </div>
      </section>

      <section className={styles.features} id="funciones">
        <div><p className={styles.eyebrow}><span /> Diseñado para operar</p><h2>Inteligencia que acompaña<br />cada <em>kilómetro.</em></h2></div>
        <div className={styles.featureList}><span>01</span><p>Alertas en tiempo real</p><span>02</span><p>Datos protegidos de extremo a extremo</p><span>03</span><p>Escala para toda tu operación</p></div>
      </section>

      <footer className={styles.footer}><Link className={styles.brand} href="/informativo"><span className={styles.brandMark}>S</span><span>sigil<span className={styles.brandDot}>.</span>ia</span></Link><span>Seguridad que se anticipa.</span><span>© 2025 Sigil.IA</span></footer>
    </main>
  );
}
