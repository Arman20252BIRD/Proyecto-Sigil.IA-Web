import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Política de cookies | Sigilia",
  description: "Política de cookies y tecnologías de almacenamiento de Sigilia.",
};

const sections = [
  { title: "I. Introducción", paragraphs: ["Sigilia utiliza tecnologías de almacenamiento necesarias para conservar la decisión de cookies y, cuando la persona lo autoriza, recordar preferencias de interfaz y medición analítica. Las cookies publicitarias no se utilizan."] },
  { title: "II. Cookies para el funcionamiento de la web", paragraphs: ["La cookie sigil_cookie_consent controla la aparición del aviso y conserva la decisión de la persona. Tiene una duración de 180 días, utiliza la ruta / y la directiva SameSite=Lax. En conexiones HTTPS se añade Secure. No contiene nombre, correo, contraseña, ubicación, biometría ni contenido de formularios.", "La autenticación del administrador no utiliza una cookie de seguimiento: el token se almacena temporalmente en sessionStorage bajo la clave sigil_access_token y se elimina al cerrar la sesión."] },
  { title: "III. Cookies para preferencias", paragraphs: ["La cookie sigil_ui_preferences es opcional y solo se crea después de aceptar las cookies de preferencias. Guarda únicamente idioma y apariencia, con valores como es-light, es-dark, en-light o en-dark, durante 180 días. Si la persona retira el permiso, Sigilia elimina esta cookie y restablece español y modo claro."] },
  { title: "IV. Servicios propios y externos", paragraphs: ["El portal informativo y el panel administrativo utilizan servicios propios de Sigilia, como la aplicación Next.js, el backend Express y PostgreSQL. Estos servicios registran la decisión de cookies en la auditoría del backend, pero no generan cookies adicionales de seguimiento.", "Para funciones concretas se utilizan servicios externos: Gmail API y OAuth para preparar solicitudes ARCO, y OpenStreetMap para mostrar una ubicación GPS cuando corresponde. Estos servicios se solicitan únicamente al utilizar su función; Sigilia no les envía la cookie sigil_cookie_consent ni los utiliza para analítica. Las cookies o el almacenamiento que un proveedor externo pudiera crear en su propio dominio se rigen por sus propias políticas."] },
  { title: "V. Cookies analíticas y publicitarias", paragraphs: ["Si la persona autoriza las cookies analíticas, Sigilia utiliza Google Analytics 4 con el identificador G-E27G0MHB5X para medir visitas y navegación entre páginas. La medición no se carga antes del consentimiento. Google Consent Mode mantiene analytics_storage, ad_storage, ad_user_data y ad_personalization denegados hasta que exista autorización. Sigilia no utiliza cookies publicitarias ni perfiles publicitarios."] },
  { title: "VI. Gestión del consentimiento", paragraphs: ["Al entrar a la página informativa se muestra un banner que bloquea temporalmente la interacción hasta que la persona decide. Las opciones opcionales no aparecen premarcadas. Puede rechazar cookies opcionales, aceptar todas o personalizar las preferencias, incluidas las analíticas. La decisión se guarda en sigil_cookie_consent y se comprueba antes de volver a mostrar el banner. Al retirar las analíticas, Sigilia actualiza el consentimiento a denied y elimina las cookies de Google Analytics disponibles."] },
  { title: "VII. Modificación y auditoría", paragraphs: ["Después de elegir, el aviso desaparece y el enlace Configurar cookies queda disponible en el pie legal del portal informativo. Desde ahí la persona puede cambiar su decisión. Cada decisión inicial o modificación se envía al backend y se registra en audit_logs con acción, categorías, versión, fecha y hora, dirección IP, navegador y resultado. Los registros de visitantes no autenticados pueden tener admin_id vacío, porque la decisión no exige una cuenta.", "La exportación no está disponible para administradores desde la interfaz web. El equipo de TI debe conectarse directamente a PostgreSQL y ejecutar el script servidor/models/base-datos/export-cookie-audit.sql. El comando consulta audit_logs y genera sigilia-cookie-audit.txt en la carpeta desde la que se ejecuta psql, con el identificador, fecha, acción, categorías, versión, IP, navegador y detalles de cada registro."] },
  { title: "VIII. Actualización y contacto", paragraphs: ["La política se actualizará si Sigilia incorpora nuevas tecnologías de almacenamiento o servicios. Para dudas sobre cookies y preferencias, la persona puede escribir a sigil.ia.soporte@gmail.com."] },
] as const;

export default function CookiesPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/informativo" className={styles.brand} aria-label="Sigilia"><Image src="/logo-sigilia-original.png" alt="Sigilia" width={2560} height={960} priority /></Link>
        <span className={styles.version}>Versión 1.0 · Última actualización: 26 de noviembre de 2026</span>
      </header>
      <article className={styles.document}>
        <span className={styles.kicker}>INFORMACIÓN LEGAL</span>
        <h1>Política de cookies</h1>
        <p className={styles.intro}>En https://sigilia.com.mx, Sigilia utiliza cookies y tecnologías similares de almacenamiento local, como sessionStorage, para garantizar el funcionamiento seguro de la plataforma, proteger la infraestructura contra amenazas, facilitar la navegación y, únicamente cuando la persona lo autoriza, obtener estadísticas de uso para mejorar la calidad del sitio.</p>
        {sections.map(({ title, paragraphs }) => <section key={title}><h2>{title}</h2>{paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>)}
        <Link href="/informativo" className={styles.button}>Volver al inicio</Link>
      </article>
    </main>
  );
}
