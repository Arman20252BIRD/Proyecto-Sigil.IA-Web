import type { Metadata } from "next";
import Link from "next/link";
import { PublicFooter, PublicHeader } from "../components/public-header";
import scrollStyles from "../components/scroll-effects.module.css";
import styles from "../components/public-pages.module.css";

export const metadata: Metadata = { title: "Planes y cotización | Sigilia", description: "Planes empresariales de protección y monitoreo por escala de operación." };

const plans = [
  { name: "Plan PyME", audience: "Para pequeñas empresas que comienzan a profesionalizar su operación.", volume: "Hasta 25 conductores", detail: ["Kit por vehículo", "Panel web administrativo", "Panel móvil del conductor", "Alertas y consulta de eventos", "Soporte de implementación"] },
  { name: "Plan Empresarial", audience: "Para flotillas medianas y grandes con operación continua.", volume: "26 a 250 conductores", detail: ["Todo lo del Plan PyME", "Sensores configurados por operación", "Historial operativo extendido", "Soporte prioritario", "Acompañamiento de despliegue"] },
  { name: "Plan Corporativo", audience: "Para organizaciones de gran escala con varias sedes o estados.", volume: "Más de 250 conductores", detail: ["Kit y configuración por sede", "Integraciones y reportes a medida", "Arquitectura escalable", "Gerente de cuenta", "Mesa técnica coordinada"] },
];

export default function PreciosPage() {
  return <main className={`${styles.page} ${scrollStyles.publicPage}`}>
    <PublicHeader />
    <section className={styles.hero}>
      <span className={styles.kicker}>Inversión por escala</span>
      <h1>Elige el alcance que necesita tu <span>operación.</span></h1>
      <p>Reduce costos por siniestros y mantenimiento preventivo con una solución dimensionada a tu flotilla. Sigilia trabaja mediante cotización y validación empresarial.</p>
      <div className={styles.heroActions}><Link className={styles.primary} href="#planes">Ver los planes</Link></div>
    </section>
    <section className={styles.section} id="planes">
      <div className={styles.priceGrid}>{plans.map((plan, index) => <article className={`${styles.priceCard} ${index === 1 ? styles.priceCardFeatured : ""}`} key={plan.name}>{index === 1 && <span className={styles.popular}>Más solicitado</span>}<h3>{plan.name}</h3><p className={styles.priceAudience}>{plan.audience}</p><div className={styles.priceLabel}>{plan.volume}</div><ul>{plan.detail.map((entry) => <li key={entry}>{entry}</li>)}</ul><Link className={styles.primary} href={`/cotizar?plan=${encodeURIComponent(plan.name)}`}>Cotizar ahora</Link></article>)}</div>
      <div className={styles.kit}><h3>Kit completo incluido en cada plan</h3><p>La diferencia entre planes es el volumen, el nivel de acompañamiento y la configuración de la operación; cada unidad validada contempla los componentes necesarios para su despliegue.</p><div className={styles.kitList}><span>Microcontrolador ESP32</span><span>Sensores</span><span>Accesorios</span><span>Panel web</span><span>Panel móvil</span><span>Soporte técnico</span><span>Mantenimiento</span></div></div>
    </section>
    <section className={`${styles.section} ${styles.sectionAlt}`}><div className={styles.sectionInner}><span className={styles.kicker}>Preguntas frecuentes</span><h2 className={styles.sectionTitle}>Antes de solicitar tu propuesta</h2><div className={styles.faq}><details><summary>¿Hay un mínimo de vehículos?</summary><p>El volumen se revisa con cada empresa. El Plan PyME permite iniciar con una flotilla pequeña y los planes superiores se dimensionan por cantidad de unidades y sedes.</p></details><details><summary>¿Cuánto tarda la instalación?</summary><p>El calendario depende del número de vehículos, ciudades y configuración de sensores. Se define después de la validación técnica.</p></details><details><summary>¿Cómo se realiza el soporte?</summary><p>El soporte se coordina por los canales acordados en la propuesta, con alcance de instalación, mantenimiento y atención operativa.</p></details><details><summary>¿Puedo pagar directamente desde la página?</summary><p>No. Primero se valida la empresa, se prepara la cotización y después se acuerda el método de pago privado o la facturación correspondiente.</p></details></div></div></section>
    <PublicFooter />
  </main>;
}
