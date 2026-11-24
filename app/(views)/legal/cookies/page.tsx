import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Política de cookies | SIGILIA",
  description: "Política de cookies y tecnologías de almacenamiento de SIGILIA.",
};

const sections = [
  ["1. Introducción", "SIGILIA utiliza tecnologías de almacenamiento necesarias para conservar la decisión de cookies y, cuando la persona lo autoriza, recordar preferencias de interfaz y medición analítica. Las cookies publicitarias no se utilizan."],
  ["2. Cookies para el funcionamiento de la web", "La cookie sigil_cookie_consent controla la aparición del aviso y conserva la decisión de la persona. Tiene una duración de 180 días, utiliza la ruta / y la directiva SameSite=Lax. En conexiones HTTPS se añade Secure. No contiene nombre, correo, contraseña, ubicación, biometría ni contenido de formularios.", "La autenticación del administrador no utiliza una cookie de seguimiento: el token se almacena temporalmente en sessionStorage bajo la clave sigil_access_token y se elimina al cerrar la sesión."],
  ["3. Cookies para preferencias", "La cookie sigil_ui_preferences es opcional y solo se crea después de aceptar las cookies de preferencias. Guarda únicamente idioma y apariencia, con valores como es-light, es-dark, en-light o en-dark, durante 180 días. Si la persona retira el permiso, SIGILIA elimina esta cookie y restablece español y modo claro."],
  ["4. Servicios propios y externos", "El portal informativo y el panel administrativo utilizan servicios propios de SIGILIA, como la aplicación Next.js, el backend Express y PostgreSQL. Estos servicios registran la decisión de cookies en la auditoría del backend, pero no generan cookies adicionales de seguimiento.", "Para funciones concretas se utilizan servicios externos: Gmail API y OAuth para preparar solicitudes ARCO, y OpenStreetMap para mostrar una ubicación GPS cuando corresponde. Estos servicios se solicitan únicamente al utilizar su función; SIGILIA no les envía la cookie sigil_cookie_consent ni los utiliza para analítica. Las cookies o almacenamiento que un proveedor externo pudiera crear en su propio dominio se rigen por sus propias políticas."],
  ["5. Cookies analíticas y publicitarias", "Si la persona autoriza las cookies analíticas, SIGILIA utiliza Google Analytics 4 con el identificador G-E27G0MHB5X para medir visitas y navegación entre páginas. La medición no se carga antes del consentimiento. Google Consent Mode mantiene analytics_storage, ad_storage, ad_user_data y ad_personalization denegados hasta que exista autorización. SIGILIA no utiliza cookies publicitarias ni perfiles publicitarios."],
  ["6. Gestión del consentimiento", "Al entrar a la página informativa se muestra un banner que bloquea temporalmente la interacción hasta que la persona decide. Las opciones opcionales no aparecen premarcadas. Puede rechazar cookies opcionales, aceptar todas o personalizar las preferencias, incluidas las analíticas. La decisión se guarda en sigil_cookie_consent y se comprueba antes de volver a mostrar el banner. Al retirar las analíticas, SIGILIA actualiza el consentimiento a denied y elimina las cookies GA disponibles."],
  ["7. Modificación y auditoría", "Después de elegir el aviso desaparece y la opción Configurar cookies queda disponible únicamente como enlace discreto en el pie legal del portal informativo. Desde ahí la persona puede cambiar su decisión. Cada decisión inicial o modificación se envía al backend y se registra en audit_logs con acción, categorías, versión, fecha y hora, dirección IP, navegador y resultado. Los registros de visitantes no autenticados pueden tener admin_id vacío, porque la decisión no exige una cuenta.", "La exportación no está disponible para administradores desde la interfaz web. El equipo de TI debe conectarse directamente a PostgreSQL y ejecutar el script servidor/models/base-datos/export-cookie-audit.sql. El comando consulta audit_logs y genera sigilia-cookie-audit.txt en la carpeta desde la que se ejecuta psql, con el identificador, fecha, acción, categorías, versión, IP, navegador y detalles de cada registro."],
  ["8. Actualización y contacto", "La política se actualizará si SIGILIA incorpora nuevas tecnologías de almacenamiento o servicios. Para dudas sobre cookies y preferencias, la persona puede escribir a sigil.ia.soporte@gmail.com."],
];

export default function CookiesPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/informativo" aria-label="SIGILIA">
          <Image src="/logo-sigilia-original.png" alt="SIGILIA" width={2560} height={960} priority />
        </Link>
        <Link href="/informativo">Volver al portal</Link>
      </header>
      <article className={styles.document}>
        <span className={styles.kicker}>INFORMACIÓN LEGAL</span>
        <h1>Política de cookies</h1>
        <p className={styles.intro}>Última actualización: noviembre 2026 · Versión: 1.0</p>
        {sections.map(([title, ...paragraphs]) => (
          <section key={title}>
            <h2>{title}</h2>
            {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>
        ))}
      </article>
    </main>
  );
}
