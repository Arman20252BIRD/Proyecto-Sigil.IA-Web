import type { Metadata } from "next";
import { PublicFooter, PublicHeader } from "../components/public-header";
import scrollStyles from "../components/scroll-effects.module.css";
import styles from "../components/public-pages.module.css";

export const metadata: Metadata = { title: "Sobre nosotros | SIGILIA", description: "Conoce el enfoque del equipo de SIGILIA." };

const team = [
  { initials: "01", name: "Wilbert Arcos", image: "/equipo/fundador-plataforma.png", role: "Cofundador · Plataforma y experiencia de usuario", text: "Diseña el panel web y móvil para que las alertas, la ubicación y el historial sean claros y fáciles de atender." },
  { initials: "02", name: "Nathalie Montserrat", image: "/equipo/fundadora-iot.jpg", role: "Cofundadora · Ingeniería IoT y conectividad", text: "Integra el ESP32, los sensores y la comunicación del vehículo para convertir señales en información útil." },
  { initials: "03", name: "Martin Yussef", image: "/equipo/fundador-infraestructura.png", role: "Cofundador · Infraestructura y ciberseguridad", text: "Asegura el funcionamiento del backend, la protección de los datos y la continuidad de la plataforma." },
];

export default function SobreNosotrosPage() {
  return <main className={`${styles.page} ${scrollStyles.publicPage}`}>
    <PublicHeader />
    <section className={styles.hero}><span className={styles.kicker}>Sobre SIGILIA</span><h1>Construimos claridad para cuidar lo que <span>se mueve.</span></h1><p>SIGILIA nació de una necesidad importante: contar con una solución confiable para detectar riesgos y cuidar vehículos en tiempo real. Somos tres estudiantes de la UTM que unimos nuestras especialidades para convertir esa necesidad en una plataforma de protección clara, conectada y pensada para empresas.</p><div className={styles.heroActions}><a className={styles.primary} href="#enfoque">Ver más</a></div></section>
    <section className={styles.section} id="enfoque"><span className={styles.kicker}>Nuestro enfoque</span><h2 className={styles.sectionTitle}>Tecnología que acompaña decisiones reales</h2><div className={styles.split}><article className={styles.card}><div className={styles.cardIcon}><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="15" rx="2" /><path d="M7 16v-3M12 16V9M17 16v-5" /></svg></div><h3>Diseño para la operación</h3><p>La plataforma se plantea para que la información de sensores, eventos y ubicación llegue al equipo que necesita actuar, sin perder el contexto.</p></article><article className={styles.card}><div className={styles.cardIcon}><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3 5 6v5c0 4.5 2.8 8 7 10 4.2-2 7-5.5 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg></div><h3>Despliegue responsable</h3><p>El acceso administrativo es cerrado y se habilita después de validar la empresa, el alcance de la flotilla y las condiciones del servicio.</p></article></div></section>
    <section className={`${styles.section} ${styles.sectionAlt}`} id="equipo"><div className={styles.sectionInner}><span className={styles.kicker}>Equipo</span><h2 className={styles.sectionTitle}>Tres áreas, una misma misión</h2><p className={styles.sectionLead}>Los tres integrantes estudiamos en la UTM y participamos en la construcción integral de SIGILIA: experiencia web y móvil, integración IoT, infraestructura, ciberseguridad y continuidad operativa.</p><div className={styles.teamGrid}>{team.map((member) => <article className={styles.teamCard} key={member.initials}><div className={styles.portrait}><img className={styles.portraitImage} src={member.image} alt={`${member.name}, ${member.role}`} /></div><span className={styles.teamRole}>{member.role}</span><h3>{member.name}</h3><p>{member.text}</p></article>)}</div></div></section>
    <PublicFooter />
  </main>;
}
