import type { Metadata } from "next";
import { PublicFooter, PublicHeader } from "../components/public-header";
import scrollStyles from "../components/scroll-effects.module.css";
import styles from "../components/public-pages.module.css";

export const metadata: Metadata = {
  title: "Servicios | Sigilia",
  description: "Hardware, sensores y plataformas de monitoreo vehicular para operaciones empresariales.",
};

const hardware = [
  { icon: "▣", image: "/servicios/esp32.jpg", title: "Microcontrolador ESP32", text: "Nodo de procesamiento instalado en el vehículo para concentrar las lecturas de los sensores y preparar la telemetría.", items: ["Procesamiento local", "Conectividad para telemetría", "Integración con sensores"] },
  { icon: "⌁", image: "/servicios/sensores.jpg", title: "Sensores vehiculares", text: "Módulos para observar señales relevantes del vehículo y su habitáculo, de acuerdo con el alcance contratado.", items: ["Movimiento e impactos", "Sonido y patrones acústicos", "Peso y carga"] },
  { icon: "⌖", image: "/servicios/gps.webp", title: "GPS y conectividad", text: "Ubicación y comunicación para relacionar los eventos con la ruta y mantener el contexto operativo de cada unidad.", items: ["Posición del vehículo", "Historial de eventos", "Comunicación con la plataforma"] },
];

const software = [
  { icon: "admin", title: "Panel administrativo", text: "Vista central para gestionar conductores, vehículos, alertas, eventos, GPS y registros históricos de la operación." },
  { icon: "mobile", title: "Panel móvil del conductor", text: "Experiencia enfocada en el conductor para recibir avisos, validar situaciones y mantener comunicación con la operación." },
  { icon: "support", title: "Soporte y mantenimiento", text: "Acompañamiento para la instalación, configuración, actualización y continuidad operativa del kit y la plataforma." },
];

function SoftwareIcon({ type }: { type: string }) {
  const paths = {
    admin: <><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 9h8M8 13h5M8 16h3" /></>,
    mobile: <><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M10 6h4M11 18h2" /></>,
    support: <><path d="M12 3a6 6 0 0 0-6 6v3a3 3 0 0 0 3 3h1v-5H7" /><path d="M12 3a6 6 0 0 1 6 6v3a3 3 0 0 1-3 3h-1v-5h4M10 19h4" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[type as keyof typeof paths]}</svg>;
}

export default function ServiciosPage() {
  return <main className={`${styles.page} ${scrollStyles.publicPage}`}>
    <PublicHeader />
    <section className={styles.hero}>
      <span className={styles.kicker}>Servicios Sigilia</span>
      <h1>Un kit completo para proteger cada <span>unidad.</span></h1>
      <p>Sigilia reúne el kit del vehículo, la plataforma y el soporte necesario para proteger cada unidad y responder a tiempo.</p>
      <div className={styles.heroActions}><a className={styles.primary} href="#kit">Conocer qué contiene el kit</a></div>
    </section>
    <section className={styles.section} id="kit">
      <span className={styles.kicker}>Hardware y telemetría</span>
      <h2 className={styles.sectionTitle}>Lo que integra cada vehículo</h2>
      <p className={styles.sectionLead}>El alcance final se define durante la validación técnica. Cada unidad contratada recibe un kit configurado para la operación de la empresa.</p>
      <div className={styles.grid3}>{hardware.map((item) => <article className={styles.card} key={item.title}><div className={styles.visual}>{item.image ? <img className={styles.cardImage} src={item.image} alt={item.title} /> : item.icon}</div><h3>{item.title}</h3><p>{item.text}</p><ul>{item.items.map((entry) => <li key={entry}>{entry}</li>)}</ul></article>)}</div>
    </section>
    <section className={`${styles.section} ${styles.sectionAlt}`}>
      <div className={styles.sectionInner}><span className={styles.kicker}>Plataforma y operación</span><h2 className={styles.sectionTitle}>La información llega donde hace falta</h2><p className={styles.sectionLead}>El hardware se complementa con herramientas para administrar la flota, acompañar al conductor y mantener el servicio en operación.</p><div className={styles.grid3}>{software.map((item) => <article className={styles.card} key={item.title}><div className={styles.cardIcon}><SoftwareIcon type={item.icon} /></div><h3>{item.title}</h3><p>{item.text}</p></article>)}</div></div>
    </section>
    <PublicFooter />
  </main>;
}
