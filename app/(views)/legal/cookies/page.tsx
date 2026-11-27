import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Política de cookies | Sigilia",
  description: "Política de cookies y tecnologías similares de almacenamiento de Sigilia.",
};

const sections = [
  {
    title: "I. ¿Qué son las cookies?",
    paragraphs: [
      "Son pequeños ficheros que se descargan en el ordenador, smartphone o tableta del usuario cuando accede a una página web y que permiten al titular de dicha página almacenar o recuperar determinada información técnica o de navegación, como recordar la decisión sobre el aviso de cookies o medir de forma agregada las visitas recibidas. De manera complementaria, Sigilia utiliza sessionStorage para conservar temporalmente la sesión autenticada del administrador mientras navega en el panel, sin emplearse como una cookie de seguimiento.",
    ],
  },
  {
    title: "II. Tipología de cookies",
    paragraphs: [
      "A continuación se ofrece información sobre el tipo de cookies y mecanismos de almacenamiento utilizados en Sigilia, así como la finalidad de los mismos:",
    ],
  },
  {
    title: "III. Tipos de cookies según la entidad que las gestione",
    paragraphs: [
      "Según quien sea la entidad que gestione el equipo o dominio desde donde se envían las cookies y trate los datos que se obtengan, podemos distinguir:",
      "• Cookies propias: Son aquellas que se envían al equipo terminal del usuario desde sigilia.com.mx para recordar la configuración del aviso de consentimiento y gestionar el funcionamiento básico del portal (incluyendo el almacenamiento temporal de sesión administrativa en sessionStorage).",
      "• Cookies de terceros: Son aquellas que se envían al equipo terminal del usuario desde un equipo o dominio que no es gestionado por Sigilia, sino por otra entidad que trata los datos obtenidos a través de las cookies o servicios integrados, como Cloudflare (seguridad perimetral), Google (Google Analytics 4) y OpenStreetMap (mapas bajo demanda).",
    ],
  },
  {
    title: "IV. Tipos de cookies según el plazo de tiempo que permanecen activadas en el equipo",
    paragraphs: [
      "• Cookies de sesión (y almacenamiento temporal): Están diseñadas para recabar y almacenar datos únicamente mientras el usuario accede a la plataforma. En Sigilia, la autenticación del usuario administrador se conserva temporalmente en sessionStorage y se elimina automáticamente al cerrar la sesión o la pestaña del navegador.",
      "• Cookies persistentes: Son aquellas en las que los datos siguen almacenados en el terminal y pueden ser accedidos y tratados durante un periodo definido por el responsable de la cookie, que puede ir de unos minutos a varios meses o años (como el registro de consentimiento de cookies o las cookies analíticas de Google Analytics 4 cuando son aceptadas).",
    ],
  },
  {
    title: "V. Tipos de cookies según su finalidad",
    paragraphs: [
      "• Cookies técnicas (siempre activas): Permiten al usuario la navegación a través de la plataforma y la utilización de sus funciones esenciales y de seguridad. En Sigilia incluyen el registro del aviso de consentimiento, el control de sesión y verificación multifactor (MFA) del administrador mediante sessionStorage, así como las cookies técnicas de Cloudflare empleadas para filtrar tráfico malicioso, mitigar ataques DDoS y distinguir tráfico legítimo de bots.",
      "• Servicios de terceros bajo demanda: No se cargan para analizar la navegación general del usuario; únicamente se solicitan cuando un usuario autorizado ejecuta una función específica dentro del panel. En Sigilia corresponde a OpenStreetMap, que se carga exclusivamente para mostrar la ubicación GPS al consultar un conductor con evento activo.",
      "• Cookies analíticas (opcionales): Permiten cuantificar el número de usuarios y realizar la medición y análisis estadístico de la utilización que hacen del sitio con el fin de mejorarlo. En sigilia.com.mx se utilizan cookies analíticas de terceros a través de Google Analytics 4, las cuales permanecen deshabilitadas por defecto y únicamente se activan si el usuario otorga su consentimiento expreso.",
      "Nota: Sigilia no utiliza cookies de personalización (idioma o apariencia) ni cookies publicitarias, por lo que no crea perfiles comerciales ni comparte datos de navegación con anunciantes.",
    ],
  },
  {
    title: "VI. ¿Quién utiliza las cookies?",
    paragraphs: [
      "La información que se recaba a través de las cookies de sigilia.com.mx es tratada por Sigilia y por los proveedores tecnológicos que prestan servicios específicos a la plataforma:",
      "• Cloudflare: Proporciona la capa de protección perimetral (WAF) y mitigación contra ataques DDoS mediante cookies estrictamente técnicas.",
      "• Google (Google Analytics 4): Presta el servicio de analítica web que instala cookies únicamente cuando el usuario lo autoriza, con la exclusiva finalidad de elaborar informes estadísticos agregados.",
      "• OpenStreetMap: Opera exclusivamente bajo demanda cuando el administrador consulta un mapa GPS de un evento activo.",
    ],
  },
  {
    title: "VII. Gestión de las cookies",
    paragraphs: [
      "El usuario puede aceptar, rechazar o configurar el uso de cookies analíticas en cualquier momento mediante el panel de consentimiento de cookies disponible en sigilia.com.mx. Adicionalmente, puede gestionar las cookies a través de las opciones que ofrecen los navegadores más comunes. Si se impide la instalación de todas las cookies o el almacenamiento de sesión, algunas funcionalidades del portal, como el inicio de sesión administrativo o las medidas de seguridad perimetral, pueden verse afectadas.",
    ],
  },
  {
    title: "VIII. Cómo visualizar las cookies",
    paragraphs: [
      "Todos los navegadores ofrecen al usuario la posibilidad de buscar y visualizar las cookies que instala un determinado sitio web, consultar su duración y eliminarlas. A continuación se muestran enlaces informativos de los navegadores más utilizados:",
      "• Google Chrome: https://support.google.com/chrome/answer/95647?hl=es-419",
      "• Mozilla Firefox: https://support.mozilla.org/es/kb/cookies-informacion-que-los-sitios-web-guardan-en-",
      "• Microsoft Edge: https://support.microsoft.com/es-es/topic/ver-las-cookies-en-microsoft-edge-a7d95376-f2cd-8e4a-25dc-1de753474879",
      "• Safari: https://support.apple.com/es-mx/guide/safari/sfri11471/mac",
    ],
  },
  {
    title: "IX. Cómo desactivar o eliminar las cookies",
    paragraphs: [
      "Para desactivar, restringir, bloquear o eliminar las cookies, el usuario puede modificar la configuración del navegador que utilice en su terminal (ordenador, smartphone o tablet). Con carácter general, los navegadores ofrecen las siguientes opciones:",
      "• Rechazar todas las cookies para que no se instale ninguna de ningún sitio web en el terminal.",
      "• Mostrar un aviso antes de que se produzca la instalación de una cookie para decidir si se acepta o no.",
      "• Rechazar únicamente las cookies de terceros, manteniendo las propias del sitio web visitado.",
      "• Utilizar la opción de navegación en modo privado, mediante la cual las cookies se eliminan de manera automática al finalizar la sesión de navegación:",
      "  o Google Chrome: https://support.google.com/chrome/answer/95464?hl=es-419",
      "  o Mozilla Firefox: https://support.mozilla.org/es/kb/navegacion-privada-Firefox-no-guardar-historial-navegacion",
      "  o Microsoft Edge: https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09",
      "  o Safari: https://support.apple.com/es-mx/guide/safari/ibrw1069/mac",
    ],
  },
  {
    title: "X. Contacto",
    paragraphs: [
      "Para cualquier duda, aclaración o solicitud relacionada con esta Política de cookies y el ejercicio de derechos ARCO en Sigilia, puede comunicarse al correo electrónico oficial de soporte: soporte@sigilia.com.mx.",
    ],
  },
] as const;

export default function CookiesPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/informativo" className={styles.brand} aria-label="Sigilia">
          <Image src="/logo-sigilia-original.png" alt="Sigilia" width={2560} height={960} priority />
        </Link>
        <span className={styles.version}>Versión 1.0 · Última actualización: 26 de noviembre de 2026</span>
      </header>
      <article className={styles.document}>
        <span className={styles.kicker}>INFORMACIÓN LEGAL</span>
        <h1>Política de cookies</h1>
        <p className={styles.intro}>Le informamos de que en https://sigilia.com.mx (Sigilia) utilizamos cookies y tecnologías similares de almacenamiento local (como sessionStorage) con objeto de garantizar el funcionamiento seguro de la plataforma, proteger la infraestructura contra amenazas, facilitar la navegación y, únicamente cuando el usuario lo autoriza, obtener estadísticas de uso para mejorar la calidad del sitio.</p>
        {sections.map(({ title, paragraphs }) => (
          <section key={title}>
            <h2>{title}</h2>
            {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>
        ))}
        <Link href="/informativo" className={styles.button}>Volver al inicio</Link>
      </article>
    </main>
  );
}
