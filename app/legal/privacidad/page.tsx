import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Aviso de privacidad | Sigil.IA",
  description: "Aviso de privacidad integral de Sigil.IA.",
};

const sections = [
  ["I. Responsable", "Sigil.IA, con domicilio en calle 111 número 315, colonia Santa Rosa, Mérida, Yucatán, México, es responsable del tratamiento de los datos personales. El contacto del Departamento de Datos Personales es sigil.ia.soporte@gmail.com."],
  ["II. A quién aplica", "Este aviso aplica a administradores del panel, conductores que utilizan la aplicación y conductores registrados por la organización que administra una flota. Cuando una organización carga datos de un conductor, la organización determina el registro y Sigil.IA los trata conforme a sus instrucciones."],
  ["III. Datos tratados", "Podemos tratar nombre, correo, teléfono, empresa, credenciales protegidas, configuración TOTP, datos de conductores, vehículos, hardware, GPS, eventos, sensores, alertas, respuestas del conductor y datos técnicos como IP, navegador, dispositivo, fecha y hora de acceso."],
  ["IV. Datos sensibles", "El descriptor facial de 1,024 valores numéricos se calcula en el navegador, no es una fotografía y se almacena cifrado únicamente para el segundo factor de autenticación. El reconocimiento facial requiere consentimiento expreso y separado."],
  ["V. Sensores y GPS", "Los sensores pueden detectar movimiento, vibraciones, inclinación, patrones acústicos, peso del asiento y posición GPS. El análisis de sonido se realiza para detectar eventos y no se almacenan conversaciones ni grabaciones de audio."],
  ["VI. Finalidades necesarias", "Crear y administrar cuentas, autenticar usuarios, gestionar conductores y vehículos, mostrar eventos y posiciones, operar la plataforma, detectar accesos indebidos, generar alertas, dar soporte y atender solicitudes ARCO."],
  ["VII. Finalidades opcionales", "Podemos enviar comunicados sobre mejoras o solicitar encuestas únicamente si la persona marca la casilla opcional. Rechazar estas finalidades no afecta el acceso al servicio."],
  ["VIII. Consentimientos", "El aviso se pone a disposición antes del registro. El reconocimiento facial y cualquier finalidad opcional se solicitan mediante casillas independientes, no premarcadas. Se registra la versión, fecha, hora, IP y navegador de la aceptación."],
  ["IX. Derechos ARCO", "La persona titular puede solicitar acceso, rectificación, cancelación u oposición mediante sigil.ia.soporte@gmail.com, el formulario web o el formato descargable disponible en la sección Solicitud ARCO."],
  ["X. Conservación", "Los datos se conservan solamente durante el tiempo necesario para las finalidades informadas. Los registros técnicos se conservan por el periodo definido en el aviso y los consentimientos y solicitudes se conservan el tiempo necesario para acreditar el cumplimiento y atender responsabilidades."],
  ["XI. Seguridad", "Las contraseñas se protegen con hash, el descriptor facial y el secreto TOTP se cifran con AES-256-GCM, las sesiones se firman, existen límites de intentos y se registran las operaciones relevantes de seguridad y administración."],
  ["XII. Cambios", "La versión vigente del aviso siempre estará publicada en esta página. Si cambian las finalidades, los datos tratados o las condiciones relevantes, se mostrará una nueva versión y se solicitará nuevamente el consentimiento cuando corresponda."],
];

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/informativo" className={styles.brand} aria-label="Sigil.IA"><Image src="/logo-sigil-transparente.png" alt="Sigil.IA" width={190} height={90} priority /></Link>
        <span className={styles.version}>Versión 1.0 · noviembre 2026</span>
      </header>
      <article className={styles.document}>
        <span className={styles.kicker}>INFORMACIÓN LEGAL</span>
        <h1>Aviso de privacidad</h1>
        <p className={styles.intro}>Este aviso explica qué datos trata Sigil.IA, para qué los utiliza, cómo los protege y qué opciones tiene la persona titular.</p>
        {sections.map(([title, text]) => <section key={title}><h2>{title}</h2><p>{text}</p></section>)}
      </article>
    </main>
  );
}
