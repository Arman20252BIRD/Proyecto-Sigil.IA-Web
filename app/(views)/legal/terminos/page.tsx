import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Términos y condiciones | Sigilia",
  description: "Términos y condiciones de la plataforma Sigilia.",
};

const sections = [
  ["1. Identidad y domicilio del responsable", `Estos Términos y Condiciones regulan el uso de la plataforma Sigilia y la contratación de sus servicios. Los ofrece Sigilia con domicilio en la calle 111 número 315, colonia Santa Rosa en Mérida, Yucatán, México. Puedes contactarnos en soporte@sigilia.com.mx, en horario de lunes a viernes, en un horario de 9:00 a 18:00 horas, tiempo del centro de México (UTC-6). Por “Plataforma” entendemos el panel web, la aplicación móvil del conductor y los servicios en la nube; por “Dispositivo”, el equipo con GPS y sensores de movimiento, sonido y peso del asiento que se instala en el vehículo; por “Cliente”, quien contrata el servicio; por “Administrador”, quien usa el panel en su nombre; y por “Conductor”, quien maneja un vehículo con Dispositivo.`],
  ["2. Aceptación", `Aceptas estos Términos al marcar la casilla correspondiente y pulsar el botón de registro o contratación. Esa aceptación electrónica es válida conforme al Código Civil Federal y al Código de Comercio, y guardamos la fecha, la hora y la versión que aceptaste como prueba. Debes ser mayor de edad y, si contratas por una empresa, tener facultades para obligarla. Si contratas como consumidor, es decir, como destinatario final del servicio, la Ley Federal de Protección al Consumidor (LFPC) se aplica junto con estos Términos y sus derechos son irrenunciables (art. 1). Si contratas como empresa para tu operación, estos Términos y el plan elegido son el contrato entre las partes. También forman parte de él el Aviso de Privacidad.`],
  ["3. Qué es y qué no es el servicio", `Sigilia incluye un panel web para gestionar vehículos, conductores y sensores y consultar eventos y ubicación; una aplicación móvil que envía al conductor la alerta “¿Eres tú?”; el Dispositivo, que reúne datos del vehículo y los envía por red celular; y una detección con inteligencia artificial que analiza las señales para identificar patrones asociados a un posible robo. El soporte se presta por correo electrónico a través desoporte@sigilia.com.mx. La atención se brinda de lunes a viernes, en un horario de 9:00 a 18:00 horas (Hora del Centro de México / UTC-6, correspondiente a Mérida, Yucatán), excluyendo días festivos oficiales en México. El tiempo estimado de primera respuesta es de 24 horas hábiles.

Sigilia no es un servicio de seguridad pública, de emergencias, de custodia ni de recuperación de vehículos, y no es un seguro. No garantizamos que un robo no ocurra, que siempre se detecte ni que el vehículo se recupere. La detección es una ayuda y puede generar falsos positivos (alertas sin robo) y falsos negativos (robos sin alerta). Seguirás siendo responsable de proteger tu vehículo con medidas razonables.`],
  ["4. Cómo funcionan las alertas y de qué dependen", `Cuando los sensores detectan algo fuera de lo normal, por ejemplo, un perfil de asiento que no coincide con los registrados, el sistema genera una alerta y la aplicación pide al conductor confirmar si es él. Si responde “No soy yo”, o no responde en un tiempo máximo de 3 minutos, la alerta se escala según el plan: avisar al Administrador y, cuando proceda, a servicios de emergencia o autoridades. El servicio depende de la cobertura celular y de GPS, de la energía del vehículo, de que el Dispositivo esté bien instalado y sin manipular, y de que el teléfono del conductor tenga conexión y permiso para notificaciones. Si algo de eso falla, una alerta puede retrasarse o no llegar.`],
  ["5. Tu cuenta", `Entras con contraseña y una verificación en dos pasos (código TOTP o, si lo activas, reconocimiento facial). Eres responsable de guardar tus credenciales, no compartirlas y de lo que se haga con tu cuenta; si sospechas un uso no autorizado, avísanos de inmediato y cambia tu contraseña. El Administrador responde por las cuentas de los Conductores que registre y debe dar de baja a quien deje de usar la Plataforma. La información que nos des debe ser veraz y estar actualizada.`],
  ["6. Contratación, precios y condiciones de pago", `Sigilia opera bajo un modelo de negocio B2B (Business-to-Business), dirigido a empresas, compañías de logística, organizaciones con flotillas vehiculares y otros clientes empresariales. La contratación de los servicios se realiza mediante solicitud de cotización y validación comercial, por lo que no existe una compra directa ni una pasarela de pagos pública en el sitio web.

El servicio contempla dos conceptos de cobro:

Adquisición del hardware: El cliente realiza un pago único por cada kit instalado en sus vehículos, integrado por el microcontrolador, sensores y accesorios correspondientes. Una vez confirmado el pago, el equipo físico pasa a ser propiedad del cliente.

Suscripción mensual SaaS: El cliente paga una cuota recurrente por cada conductor o vehículo contratado, según el plan y las condiciones establecidas en la propuesta comercial. Esta suscripción incluye el acceso a la plataforma de monitoreo, la aplicación móvil, la conectividad con los servidores, las alertas, las actualizaciones de seguridad y los servicios de soporte y mantenimiento correspondientes al plan contratado.

Los precios se expresan en pesos mexicanos (MXN). Los importes, impuestos aplicables, cantidades y condiciones de pago se especificarán en la cotización y propuesta comercial aceptada por el cliente.

Los pagos podrán realizarse mediante transferencia bancaria SPEI, facturación directa o enlaces de pago privados proporcionados por Sigilia a través de proveedores autorizados, como Stripe. No se solicitarán datos bancarios o de tarjetas mediante formularios públicos del sitio web.

Las suscripciones se cobran por adelantado en cada periodo mensual, conforme a las condiciones aceptadas por el cliente. Sigilia no realizará cobros por servicios o conceptos que no hayan sido previamente autorizados y acordados.

Retrasos en los pagos y suspensión del servicio: En caso de que un pago recurrente no se realice en la fecha establecida, Sigilia enviará un aviso al correo electrónico registrado por el cliente. Se otorgará un periodo de gracia de tres días naturales a partir de dicho aviso para regularizar el pago. Si transcurre este periodo sin recibir el pago correspondiente, Sigilia podrá suspender automáticamente el acceso a las cuentas web y móviles asociadas a la empresa, así como rechazar la recepción y procesamiento de la telemetría de los dispositivos vinculados a la suscripción. El servicio podrá reactivarse una vez confirmado el pago pendiente.

Cancelación de la suscripción: El cliente podrá solicitar la cancelación conforme a las condiciones establecidas en su contrato o propuesta comercial. La cancelación de la suscripción no implica la devolución automática del importe pagado por los kits de hardware, ya que estos constituyen una adquisición independiente y pasan a ser propiedad del cliente. La continuidad de los servicios en la nube y las funcionalidades de monitoreo dependerá de la vigencia de la suscripción.

Propiedad intelectual y hardware: La adquisición del kit otorga al cliente la propiedad del equipo físico, pero no los derechos de propiedad intelectual sobre el firmware, software, algoritmos, diseños o componentes tecnológicos desarrollados por Sigilia. Estos elementos permanecen bajo titularidad de Sigilia y su uso se limita a las condiciones de prestación del servicio contratado.

Facturación: Sigilia proporcionará los comprobantes fiscales correspondientes a los pagos realizados, conforme a la legislación fiscal aplicable y a los datos de facturación proporcionados por el cliente.`],
  ["7. Renovación automática y cancelación", `La suscripción SaaS tendrá una periodicidad mensual y se renovará conforme a las condiciones establecidas en la propuesta comercial o contrato aceptado por el Cliente. Antes de cada renovación, Sigilia notificará al correo electrónico registrado la fecha y el importe del siguiente periodo de facturación.

El Cliente podrá solicitar la cancelación mediante una notificación por escrito a soporte@sigilia.com.mx o ventas@sigilia.com.mx, conforme a los plazos y condiciones establecidos en su contrato. Una vez confirmada la cancelación, no se generarán nuevos cargos por periodos posteriores. El acceso a la Plataforma permanecerá disponible hasta la fecha de finalización del periodo pagado, salvo que exista una causa de suspensión conforme a estos Términos.`],
  ["8. Revocación y garantía", `Si contratas como consumidor y la operación se hace a distancia, puedes revocar tu consentimiento sin responsabilidad dentro de los 5 días hábiles siguientes a la entrega del bien o a la firma del contrato, lo último que ocurra, avisándonos por escrito o por correo. Te devolveremos el precio pagado; el flete y seguro de devolver el Dispositivo corren por tu cuenta. En servicios no aplica si la fecha de prestación está a diez días hábiles o menos de la orden de compra. El Dispositivo tiene una garantía de 90 días desde su entrega contra defectos de fabricación, que no cubre mal uso, golpes, manipulación, instalación incorrecta ni modificaciones; para hacerla efectiva escribe a soporte@sigilia.com.mx.`],
  ["9. El Dispositivo", `El Dispositivo es propiedad del Cliente desde que paga. Se instala por el Cliente siguiendo la guía, sin dañar ni alterar los sistemas del vehículo; no respondemos por daños causados por una instalación de terceros no autorizados. No debes abrirlo, modificarlo, bloquearlo ni manipular sus sensores o su conexión. Cada Dispositivo se asocia a un solo vehículo registrado.`],
  ["10. Conductores y otras personas", `Si instalas Sigilia en vehículos que usan otras personas, aceptas que solo registrarás vehículos de tu propiedad o sobre los que tengas autoridad legal; que informarás a los Conductores y demás usuarios, antes de que usen la unidad, qué datos se recaban (ubicación, movimiento, sonido y peso del asiento) y para qué; que cuentas con el fundamento legal para hacerlo, incluidas tus obligaciones como empleador; y que no usarás la Plataforma para vigilar a nadie de forma oculta. El perfil de peso del asiento se registra solo con el consentimiento expreso de cada Conductor, que él da en la aplicación y puede retirar cuando quiera.`],
  ["11. Uso aceptable", `Debes usar Sigilia de forma lícita y de buena fe. Está prohibido rastrear o espiar a una persona sin su conocimiento o sin autoridad legal sobre el vehículo; acceder sin autorización a cuentas, sistemas, datos o dispositivos; falsificar, interceptar, alterar o inyectar mensajes entre los Dispositivos y la nube o suplantar un Dispositivo; hacer pruebas de vulnerabilidad, ingeniería inversa, extracción masiva de datos o sobrecarga sin autorización escrita; compartir o vender tu cuenta; introducir datos falsos o de personas sin estar autorizado; y usar la Plataforma para fines ilegales. Si encuentras una vulnerabilidad, repórtala a soporte@sigilia.com.mx y danos un plazo razonable para corregirla antes de divulgarla.`],
  ["12. Datos personales y datos del Cliente", `Tratamos tus datos personales conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares y a nuestro Aviso de Privacidad, que explica qué datos recabamos, para qué, con quién los compartimos y cómo ejercer tus derechos. Aceptar estos Términos no implica consentir el tratamiento del descriptor facial, del perfil de asiento ni de las finalidades opcionales: eso se pide por separado, con casillas específicas. Los datos que cargas o que generan tus vehículos siguen siendo tuyos; nos autorizas a tratarlos para prestarte el servicio, mantener su seguridad y cumplir la ley, y a usar datos disociados, que ya no identifican a nadie, para estadísticas y mejorar la detección. Al terminar el contrato podrás pedir una copia durante 20 días; después los eliminaremos o bloquearemos según el Aviso de Privacidad.`],
  ["13. Propiedad intelectual", `La Plataforma, el software del Dispositivo, los modelos de detección, el diseño, las marcas y los textos son de Sigilia o de quienes nos los licencian y están protegidos por la Ley Federal del Derecho de Autor y la Ley Federal de Protección a la Propiedad Industrial. Te damos una licencia limitada, no exclusiva, intransferible y revocable para usar la Plataforma mientras tu suscripción esté vigente; no puedes copiarla, venderla, sublicenciarla ni crear obras derivadas. Podemos usar sin costo las sugerencias que nos envíes.`],
  ["14. Disponibilidad y servicios de terceros", `Buscamos que la Plataforma esté disponible 99% del tiempo cada mes, sin contar mantenimientos programados, que avisaremos con anticipación cuando sea posible; podemos hacer mantenimientos de emergencia sin aviso por seguridad. Nos apoyamos en terceros (nube y mensajería para dispositivos, red celular, notificaciones, pasarela de pago y servicios de emergencia o autoridades). Actuaremos con diligencia al elegirlos, pero no controlamos sus fallas ni sus tiempos de respuesta.`],
  ["15. Responsabilidad", `Prestaremos el servicio con diligencia profesional, conforme al plan y a la publicidad que hagamos de él, que será veraz y comprobable; no prometemos que sea ininterrumpido ni que evite un robo. Si eres consumidor, nada de estos Términos te exime de nuestra responsabilidad civil ni te hace renunciar a tus derechos, incluida la bonificación o compensación que la LFPC establezca. Si eres Cliente empresarial, salvo dolo, nuestra responsabilidad total se limita al importe pagado en los 12 meses anteriores al hecho, y no respondemos por daños indirectos, lucro cesante ni por el robo del vehículo salvo que se deba a nuestro incumplimiento; esta limitación no alcanza la responsabilidad por dolo, que es exigible en todo caso. Ninguna parte responde por hechos fuera de su control razonable, como desastres naturales, fallas generales de energía o telecomunicaciones o actos de autoridad. Tú respondes por el uso indebido de la Plataforma y por incumplir los apartados 10 y 11.`],
  ["16. Suspensión y terminación", `Tú puedes terminar el contrato cancelando tu suscripción. Nosotros podemos suspender el servicio, previo aviso, por falta de pago tras el plazo del apartado 6, por uso prohibido o para proteger la seguridad del sistema o de otras personas, y lo restableceremos si la causa se corrige. Podemos terminar el contrato por incumplimiento grave o repetido, con aviso por escrito y 7 días para corregirlo, salvo que no sea corregible o ponga en riesgo a otras personas. Al terminar el contrato se suspenderá el acceso a la Plataforma y a los servicios en la nube asociados a la suscripción. El hardware adquirido permanecerá en propiedad del Cliente, sin que ello implique la continuidad de los servicios SaaS.`],
  ["17. Cambios a estos términos", `No modificamos tu contrato por nuestra cuenta. Si necesitamos cambiar estos Términos, el precio o las características del plan, te lo notificaremos por correo y en el panel con al menos 30 días de anticipación y te pediremos tu aceptación expresa. Si no aceptas, tu suscripción sigue con las condiciones vigentes hasta el final del periodo pagado y después no se renueva. Sí podemos, sin pedir aceptación, corregir errores, mejorar la seguridad, cumplir una nueva ley o actualizar funciones sin reducir de forma importante lo que contrataste.`],
  ["18. Atención, quejas y notificaciones", `Puedes presentar quejas o pedir aclaraciones nuestras oficinas ubicadas en la calle 111 número 315, colonia Santa Rosa en Mérida, Yucatán, México o en soporte@sigilia.com.mx; responderemos en un máximo de 10 días hábiles. Si eres consumidor y no estás conforme, puedes acudir a la Procuraduría Federal del Consumidor (Profeco), derecho que es irrenunciable. Te notificaremos por correo a la dirección de tu cuenta y, cuando proceda, en el panel o la aplicación; mantenerla actualizada es tu responsabilidad. Las notificaciones electrónicas son válidas conforme al Código de Comercio.`],
  ["19. Ley aplicable y disposiciones generales", `Estos Términos se rigen por las leyes de los Estados Unidos Mexicanos. Para Clientes empresariales, las partes se someten a los tribunales competentes de cada ciudad y estado; si eres consumidor, puedes acudir a Profeco y a los tribunales competentes de tu domicilio. Si una cláusula resulta nula, las demás siguen vigentes. Estos Términos, el plan y el Aviso de Privacidad son el acuerdo completo sobre este servicio. No puedes ceder tus derechos sin nuestro consentimiento por escrito; Sigilia puede ceder el contrato a quien continúe el servicio, avisándote y sin disminuir tus derechos. Que una parte no exija un derecho no significa que renuncie a él.`],
] as const;

const romanNumerals = [
  "", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
  "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX",
] as const;

function formatSectionTitle(title: string) {
  const match = title.match(/^(\d+)\.\s/);
  if (!match) return title;

  const number = Number(match[1]);
  return `${romanNumerals[number] ?? match[1]}. ${title.slice(match[0].length)}`;
}

export default function TerminosPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/informativo" aria-label="Sigilia">
          <Image src="/logo-sigilia-original.png" alt="Sigilia" width={2560} height={960} priority />
        </Link>
        <span className={styles.version}>
          Versión 1.0 · Última actualización: 13 de noviembre de 2026
        </span>
      </header>
      <article className={styles.document}>
        <span className={styles.kicker}>INFORMACIÓN LEGAL</span>
        <h1>Términos y condiciones</h1>
        {sections.map(([title, content]) => (
          <section key={title}>
            <h2>{formatSectionTitle(title)}</h2>
            <p>{content}</p>
          </section>
        ))}
        <div className={styles.backHomeWrap}>
          <Link className={styles.backHome} href="/informativo">
            Volver al inicio
          </Link>
        </div>
      </article>
    </main>
  );
}
