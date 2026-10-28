import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";
import SensorDemo from "./sensor-demo";
import { Preferences } from "../preferences";

export const metadata: Metadata = {
  title: "Sigil.IA | Monitoreo vehicular inteligente",
  description: "Arquitectura edge-computing para monitoreo vehicular e inferencia inteligente.",
};

type IconName = "security" | "memory" | "ai" | "cloud" | "radar" | "alert" | "location" | "history" | "vehicle" | "fingerprint" | "arrow" | "play";

function Icon({ name }: { name: IconName }) {
  const icons: Record<IconName, React.ReactNode> = {
    security: <path d="M12 3 5 6v5c0 4.5 2.8 8 7 10 4.2-2 7-5.5 7-10V6l-7-3Z" />,
    memory: <><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 14h3M20 9h3M20 14h3M10 10h4v4h-4z" /></>,
    ai: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>,
    cloud: <><path d="M7.5 18h9.2a4.3 4.3 0 0 0 .5-8.5A6 6 0 0 0 5.7 8.2 4.5 4.5 0 0 0 7.5 18Z" /><path d="M12 11v6M9.5 14l2.5-3 2.5 3" /></>,
    radar: <><circle cx="12" cy="12" r="8" /><path d="M12 12 18 6M12 4v2M12 18v2M4 12h2M18 12h2" /></>,
    alert: <><path d="m12 4 8 15H4L12 4Z" /><path d="M12 9v4M12 16v.1" /></>,
    location: <><path d="M19 10c0 5-7 10-7 10S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2" /></>,
    history: <><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.5" /><path d="M4 4v4.5h4.5M12 8v4l2.5 1.5" /></>,
    vehicle: <><path d="M4 15v-4l2-5h12l2 5v4M4 15h16M7 15v2M17 15v2" /><circle cx="7" cy="14" r="1" /><circle cx="17" cy="14" r="1" /></>,
    fingerprint: <path d="M8 11a4 4 0 0 1 8 0v2M6 11a6 6 0 0 1 12 0v3M10 11a2 2 0 0 1 4 0v5M4 11a8 8 0 0 1 16 0v2M8 17c.8 1.5 2 2.5 4 3M16 17c-.3 1-.8 2-1.5 2.7" />,
    arrow: <path d="M4 12h14M12 6l6 6-6 6" />,
    play: <path d="m9 6 7 6-7 6V6Z" />,
  };
  return <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">{icons[name]}</svg>;
}

const pillars = [
  ["memory", "Microcontrolador ESP32", "Nodo local de bajo consumo y alta frecuencia de muestreo. Lee señales inerciales y acústicas directamente del habitáculo del vehículo.", "CAN BUS & I2C Ready"],
  ["ai", "Inferencia inteligente", "Filtrado de falsos positivos mediante algoritmos de agrupamiento estadístico y clasificación en tiempo real.", "Clasificación on-device"],
  ["cloud", "Broker MQTT & Cloud", "Paquetes de telemetría compactados y cifrados hacia AWS IoT Core con persistencia de auditoría.", "TLS 1.3 / mTLS protocol"],
] as const;
const stages = ["Detección de eventos", "Análisis inteligente", "Comunicación y almacenamiento", "Consulta y notificaciones"];
const features = [
  ["radar", "Monitoreo de eventos", "Visualiza señales de impacto y comportamientos anómalos."], ["alert", "Alertas de seguridad", "Recibe notificaciones ante eventos relevantes."], ["location", "Ubicación del vehículo", "Consulta posición y deriva de ruta."], ["history", "Historial de eventos", "Conserva una línea de tiempo para auditoría."], ["vehicle", "Estado del vehículo", "Revisa conectividad, sensores y telemetría."], ["fingerprint", "Validación biométrica MFA", "Capa prevista para autorizar acceso a cabina."],
] as const;

export default function InformativoPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}><div className={`${styles.headerInner} infoHeaderInner`}>
        <Link className={styles.brand} href="#hero" aria-label="Sigil.IA inicio"><Image className={styles.headerLogo} src="/logo-sigil-transparente.png" alt="Sigil.IA - Ciberseguridad y telemetría vehicular" width={260} height={160} priority /></Link>
        <nav className={styles.nav} aria-label="Navegación principal"><a href="#proyecto">El proyecto</a><a href="#como-funciona">Cómo funciona</a><a href="#funciones">Funciones</a></nav>
        <div className={styles.actions}><Preferences inHeader /><Link className={styles.login} href="/login">Iniciar sesión</Link></div>
      </div></header>

      <section className={styles.hero} id="hero"><div className={styles.heroInner}>
        <div className={styles.heroCopy}><div className={styles.kicker}><span /> Monitoreo vehicular inteligente</div><h1>Más claridad para cuidar <span>lo que te mueve.</span></h1><p className={styles.lead}>Sigil.IA combina sensores, inteligencia artificial y conectividad para identificar posibles situaciones de riesgo y facilitar el monitoreo de los eventos de tu vehículo.</p><div className={styles.heroButtons}><a className={styles.primaryButton} href="#como-funciona">Conoce el sistema <Icon name="arrow" /></a><a className={styles.secondaryButton} href="#como-funciona"><Icon name="play" /> Cómo funciona</a></div><div className={styles.note}><span><Icon name="security" /></span><p>Una propuesta tecnológica en desarrollo para complementar la seguridad vehicular y telemetría de activos.</p></div></div>
        <div className={styles.diagramCard}><div className={styles.diagramHeader}><span><i /> Sistema conceptual</span><b>Telemetría nominal</b></div><div className={styles.blueprint}><div className={styles.scan} /><svg viewBox="0 0 460 220" role="img" aria-label="Diagrama conceptual de un vehículo conectado"><path className={styles.vehicleLine} d="M40 160h20c5-20 35-20 40 0h190c5-20 35-20 40 0h80c8 0 14-6 14-14l-4-21c-2-10-35-17-60-20l-55-45c-10-10-45-12-85-12h-90c-30 0-70 33-85 68l-15 15c-6 6-6 20 0 22Z" /><path className={styles.vehicleAccent} d="M140 60h70v50H105c10-25 23-42 35-50ZM225 60h65l50 50H225V60Z" /><circle className={styles.vehicleLine} cx="80" cy="160" r="22" /><circle className={styles.vehicleAccent} cx="80" cy="160" r="10" /><circle className={styles.vehicleLine} cx="310" cy="160" r="22" /><circle className={styles.vehicleAccent} cx="310" cy="160" r="10" /><circle className={styles.node} cx="160" cy="95" r="5" /><circle className={styles.node} cx="270" cy="120" r="4.5" /><circle className={styles.node} cx="360" cy="75" r="4.5" /><path className={styles.dashed} d="m160 95 110 25 90-45" /></svg><div className={styles.diagramLabels}><span><i /> ESP32 Core</span><span><i /> MPU-6050</span><span><i /> NEO-6M GPS</span></div></div><div className={styles.diagramFooter}><span><Icon name="radar" /> Sensoreado continuo</span><small>Ilustración conceptual · telemetría</small></div></div>
        <SensorDemo /></div></section>
      <section className={styles.interactiveSection} id="sensores"><div className={styles.interactiveIntro}><div className={styles.sectionNumber}>INTEGRACIÓN DE SENSORES</div><h2>De la señal física a una <span>decisión operativa.</span></h2><p>Explora cómo el sonido, el movimiento y el peso se integran en el vehículo, se procesan en el borde y llegan a la nube.</p></div><SensorDemo /></section>

      <section className={styles.section} id="proyecto"><div className={styles.sectionIntro}><div className={styles.sectionNumber}>01 / EL PROYECTO</div><h2>Tecnología que ayuda a entender lo que ocurre en ruta</h2><p>Una arquitectura edge-computing pensada para procesar micro-patrones de impacto, vibraciones acústicas anómalas y derivas de posición antes de enviar datos al servidor.</p></div><div className={styles.cardGrid}>{pillars.map(([icon, title, text, detail]) => <article className={styles.infoCard} key={title}><div className={styles.cardIcon}><Icon name={icon} /></div><h3>{title}</h3><p>{text}</p><div className={styles.cardDetail}><span>{detail}</span><Icon name="security" /></div></article>)}</div></section>
      <section className={`${styles.section} ${styles.processSection}`} id="como-funciona"><div className={styles.centerIntro}><div className={styles.sectionNumber}>02 / CÓMO FUNCIONA</div><h2>Del evento a la información, <span>paso a paso.</span></h2><p>Cuatro etapas describen cómo está planteado el sistema para transformar señales en contexto operativo.</p></div><div className={styles.stageGrid}>{stages.map((title, index) => <article className={styles.stage} key={title}><span className={styles.stageNumber}>0{index + 1}</span><div className={styles.stageLine} /><h3>{title}</h3><p>El sistema procesa la señal, conserva el contexto y entrega información útil para la operación.</p></article>)}</div></section>
      <section className={styles.section} id="funciones"><div className={styles.sectionIntro}><div className={styles.sectionNumber}>03 / FUNCIONES</div><h2>Una plataforma para operar con <span>más contexto.</span></h2><p>Capacidades pensadas para complementar las decisiones de seguridad y operación de una flota.</p></div><div className={styles.featureGrid}>{features.map(([icon, title, text]) => <article className={styles.featureCard} key={title}><div className={styles.featureTop}><span className={styles.cardIcon}><Icon name={icon} /></span><span className={styles.status}>PREVISTO</span></div><h3>{title}</h3><p>{text}</p><div className={styles.featureArrow}><Icon name="arrow" /></div></article>)}</div></section>
      <section className={styles.contact} id="contacto"><div className={styles.contactIcon}><Icon name="security" /></div><div className={styles.sectionNumber}>ACCESO CORPORATIVO</div><h2>Arquitectura abierta a pruebas de concepto institucionales</h2><p>¿Interesado en evaluar los protocolos de Sigil.IA para flotas comerciales o integraciones de telemetría especializada?</p><div className={styles.contactButtons}><Link className={styles.primaryButton} href="/login?tipo=corporativo">Contactar al equipo de ingeniería <Icon name="arrow" /></Link><a className={styles.secondaryButton} href="#proyecto">Revisar arquitectura técnica</a></div></section>
      <footer className={styles.footer}><div><Link className={styles.brand} href="#hero"><span className={styles.brandIcon}><Icon name="security" /></span>Sigil<span className={styles.brandDot}>.</span>IA</Link><p>© 2025 Sigil.IA. Arquitectura de ciberseguridad vehicular inteligente.</p></div><div className={styles.footerLinks}><a href="#contacto">Privacidad de datos</a><a href="#proyecto">Protocolos ESP32 &amp; MQTT</a><a href="#contacto">Soporte SOC de flota</a><a href="#contacto">Términos de servicio</a></div></footer>
    </main>
  );
}
