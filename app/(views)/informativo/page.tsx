import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";
import heroVideoStyles from "./hero-video.module.css";
import scrollStyles from "../components/scroll-effects.module.css";
import CookieConsent from "../legal/components/cookies";
import FlipCard from "../components/flip-card";
import { PublicFooter, PublicHeader } from "../components/public-header";

export const metadata: Metadata = {
  title: "Sigilia | Ciberseguridad & telemetría vehicular",
  description: "Protección inteligente y monitoreo vehicular en tiempo real para personas y flotillas.",
};

type IconName = "security" | "radar" | "arrow";

function Icon({ name }: { name: IconName }) {
  const icons: Record<IconName, React.ReactNode> = {
    security: <path d="M12 3 5 6v5c0 4.5 2.8 8 7 10 4.2-2 7-5.5 7-10V6l-7-3Z" />,
    radar: <><circle cx="12" cy="12" r="8" /><path d="M12 12 18 6M12 4v2M12 18v2M4 12h2M18 12h2" /></>,
    arrow: <path d="M4 12h14M12 6l6 6-6 6" />,
  };
  return <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">{icons[name]}</svg>;
}

const pillars = [
  { icon: "memory", title: "Procesador inteligente (ESP32)", text: "Analiza la información directamente dentro del vehículo, sin depender de conexiones lentas ni exponer tus datos.", backTitle: "Beneficio para ti", backText: "Obtienes una respuesta rápida en segundos y un equipo diseñado para resistir manipulaciones o intentos de sabotaje." },
  { icon: "ai", title: "Sensores de precisión", text: "Detecta vibraciones, impactos, movimiento y sonido para identificar forcejeos, cristalazos o traslados no autorizados.", backTitle: "Sin falsas alarmas", backText: "Distingue entre un bache o el tráfico normal y una amenaza real, evitando avisos innecesarios." },
  { icon: "cloud", title: "Conexión segura y constante", text: "Envía alertas y ubicación de forma cifrada hacia tu panel web y móvil en el momento exacto en que ocurre un evento.", backTitle: "Siempre conectado", backText: "Mantienes la información protegida y disponible en tiempo real para no perder de vista tu vehículo." },
] as const;

const stages = [
  { title: "Asesoría a tu medida", text: "Nos cuentas qué vehículo o flotilla quieres proteger y te recomendamos el kit ideal para tus necesidades." },
  { title: "Instalación rápida", text: "Instalamos y calibramos el dispositivo de forma discreta para que quede funcionando correctamente desde el primer día." },
  { title: "Control desde tu pantalla", text: "Recibes tu acceso privado a la plataforma web y móvil para monitorear todo desde un solo lugar." },
  { title: "Soporte continuo", text: "Te acompañamos con mantenimiento, actualizaciones y respaldo técnico para que tu protección nunca se detenga." },
] as const;

const features = [
  { icon: "alert", title: "Alertas al instante", text: "Recibe avisos inmediatos y ordenados por urgencia en cuanto se detecta una situación anormal.", label: "Respuesta", backTitle: "Actúa a tiempo", backText: "Atiende lo urgente primero y coordina con quien conduce o con las autoridades sin perder minutos valiosos." },
  { icon: "location", title: "Ubicación en tiempo real", text: "Mira en el mapa dónde está tu vehículo y el recorrido que ha hecho antes y después de cada evento.", label: "GPS", backTitle: "Visibilidad total", backText: "Ten siempre la ubicación precisa a la mano para tomar decisiones rápidas y seguras." },
  { icon: "radar", title: "Detección inteligente", text: "Identifica eventos relevantes en tu unidad y te muestra qué ocurrió sin que tengas que adivinarlo.", label: "Precisión", backTitle: "Claridad en cada aviso", backText: "Recibes información directa y fácil de entender, sin datos técnicos complicados." },
  { icon: "history", title: "Historial de eventos", text: "Guarda una línea de tiempo con lo que ha sucedido en tu vehículo, con fecha, hora y lugar exacto.", label: "Historial", backTitle: "Respaldo confiable", backText: "Úsalo para revisar rutas, aclarar incidentes o contar con evidencia clara ante aseguradoras." },
  { icon: "vehicle", title: "Estado del dispositivo", text: "Verifica que tu equipo esté encendido, con señal y reportando correctamente.", label: "Control", backTitle: "Prevención activa", backText: "Detecta desconexiones o fallas a tiempo para asegurarte de que tu vehículo nunca quede desprotegido." },
  { icon: "fingerprint", title: "Acceso privado y seguro", text: "Protege tu cuenta con verificación en dos pasos y permisos claros para que solo entren personas autorizadas.", label: "Seguridad", backTitle: "Privacidad total", backText: "Tú decides quién puede ver tus vehículos o recibir alertas, manteniendo tu información bajo resguardo." },
] as const;

export default function InformativoPage() {
  return <main className={`${styles.page} ${scrollStyles.landing}`} data-theme-surface>
    <PublicHeader />
    <section className={styles.hero} id="hero">
      <div className={styles.heroVideo} aria-hidden="true"><video className={heroVideoStyles.video} autoPlay loop muted playsInline preload="metadata"><source src="/hero-video.mp4" type="video/mp4" /></video><div className={`${styles.heroVideoShade} ${heroVideoStyles.shade}`} /></div>
      <div className={styles.heroInner}>
        <div className={styles.heroCopy}><h1>Más claridad para cuidar <span>lo que te mueve.</span></h1><p className={styles.lead}>Sistema telemático inteligente orientado a la detección temprana, mitigación y rastreo de robos vehiculares en tiempo real.</p><div className={styles.heroButtons}><a className={styles.primaryButton} href="#proyecto">Conoce la solución <Icon name="arrow" /></a></div></div>
      </div>
    </section>
    <section className={styles.section} id="proyecto"><div className={styles.sectionIntro}><div className={styles.sectionNumber}>Tecnología en tu vehículo</div><h2>Protección inteligente que trabaja por ti</h2><p>Un equipo discreto y autónomo que analiza lo que ocurre en tu vehículo y te avisa solo cuando realmente importa.</p></div><div className={styles.cardGrid}>{pillars.map((card) => <FlipCard key={card.title} {...card} />)}</div></section>
    <section className={`${styles.section} ${styles.processSection}`} id="como-funciona"><div className={styles.centerIntro}><div className={styles.sectionNumber}>Cómo funciona</div><h2>Fácil de instalar, listo para protegerte desde el primer día.</h2><p>Ya sea para un solo vehículo o para varias unidades, te acompañamos en cada paso sin complicaciones.</p></div><div className={styles.stageGrid}>{stages.map(({ title, text }) => <article className={styles.stage} key={title}><div className={styles.stageLine} /><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    <section className={styles.section} id="funciones"><div className={styles.sectionIntro}><div className={styles.sectionNumber}>Tu plataforma de control</div><h2>Todo lo que necesitas ver, claro y al instante.</h2><p>Consulta alertas, ubicación, historial y el estado de tu equipo desde cualquier dispositivo.</p></div><div className={styles.featureGrid}>{features.map((card) => <FlipCard key={card.title} {...card} />)}</div></section>
    <section className={styles.contact} id="contacto"><div className={styles.contactIcon}><Icon name="security" /></div><div className={styles.sectionNumber}>Cotización sin compromiso</div><h2>Protege lo que te mueve con una solución a tu medida.</h2><p>Cuéntanos cuántos vehículos quieres cuidar y qué necesitas monitorear. Te ayudamos a elegir el equipo y el plan ideal para ti, sin compromiso de compra.</p><div className={styles.contactButtons}><Link className={styles.primaryButton} href="/cotizar">Solicitar cotización <Icon name="arrow" /></Link><a className={styles.secondaryButton} href="/precios">Conocer los planes</a></div></section>
    <PublicFooter /><CookieConsent />
  </main>;
}
