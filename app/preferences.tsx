"use client";

import { useEffect, useState } from "react";

const pairs: Array<[string, string]> = [
  ["Resumen", "Summary"], ["Conductores", "Drivers"], ["Configuración", "Settings"], ["Soporte técnico", "Technical support"], ["Actualizar", "Refresh"],
  ["Actualizado", "Updated"], ["Gestión de conductores", "Driver management"], ["Configuración de cuenta", "Account settings"], ["Iniciar sesión", "Sign in"], ["Cerrar sesión", "Sign out"],
  ["Crear cuenta", "Create account"], ["Acceso corporativo", "Corporate access"], ["Registrar administrador", "Register administrator"], ["Reconocimiento facial", "Facial recognition"],
  ["Autenticación multifactor", "Multifactor authentication"], ["Control seguro para tu operación.", "Secure control for your operation."],
  ["Modelos locales", "Local models"], ["Plantilla cifrada", "Encrypted template"], ["Alternativa TOTP", "TOTP alternative"], ["Contraseña", "Password"], ["Correo corporativo", "Corporate email"], ["Nombre completo", "Full name"], ["Teléfono", "Phone"], ["Empresa", "Company"],
  ["Eventos", "Events"], ["Eventos registrados", "Recorded events"], ["Eventos recientes", "Recent events"], ["Actividad de eventos", "Event activity"], ["Registro histórico", "Event history"], ["Resumen de eventos", "Event summary"], ["Estado", "Status"], ["Activo", "Active"], ["Registrado", "Recorded"],
  ["Unidades activas", "Active units"], ["Unidades con GPS", "Units with GPS"], ["Conductores registrados", "Registered drivers"], ["última posición disponible", "last available position"], ["base de datos", "database"], ["Sin datos", "No data"], ["Sin ubicación", "No location"], ["resultados", "results"],
  ["Conductores y dispositivos ESP32", "Drivers and ESP32 devices"], ["Busca por ID o nombre y selecciona un conductor para desplegar su detalle.", "Search by ID or name and select a driver to view its details."], ["Buscar por ID o nombre...", "Search by ID or name..."], ["Alta de conductor", "Add driver"], ["Alta de nuevo conductor", "Add new driver"], ["Editar conductor", "Edit driver"], ["Guardar conductor", "Save driver"], ["Ver", "View"], ["Editar", "Edit"], ["Eliminar", "Delete"], ["Cancelar", "Cancel"], ["Confirmar eliminación", "Confirm deletion"],
  ["¿Eliminar conductor?", "Delete driver?"], ["Eventos", "Events"], ["GPS", "GPS"], ["Contactar", "Contact"], ["Logs y registros", "Logs and records"], ["Ver conductores →", "View drivers →"], ["No hay eventos registrados.", "No events registered."], ["No hay eventos registrados para este conductor.", "No events registered for this driver."], ["Se actualiza automáticamente con cada alerta recibida.", "Automatically updated with every alert received."],
  ["Soporte técnico de Sigil.IA", "Sigil.IA technical support"], ["Soporte disponible", "Support available"], ["Incidencia técnica", "Technical issue"], ["Guía de operación", "Operations guide"], ["Contacto de soporte", "Support contact"], ["Abrir incidencia →", "Open issue →"], ["Ver documentación →", "View documentation →"], ["Contactar soporte →", "Contact support →"], ["Antes de solicitar ayuda", "Before requesting help"],
  ["Monitoreo vehicular inteligente", "Intelligent vehicle monitoring"], ["Más claridad para cuidar", "More clarity to protect"], ["lo que te mueve.", "what moves you."], ["Más claridad para cuidar lo que te mueve.", "More clarity to protect what moves you."], ["Conoce el sistema", "Explore the system"], ["El proyecto", "The project"], ["Cómo funciona", "How it works"], ["Funciones", "Features"], ["Sistema conceptual", "Conceptual system"], ["Telemetría nominal", "Nominal telemetry"], ["Sensoreado continuo", "Continuous sensing"], ["Sensor seleccionado", "Selected sensor"], ["Sonido · habitáculo", "Sound · cabin"], ["Movimiento · chasis", "Movement · chassis"], ["Peso · carga", "Weight · load"], ["Detecta patrones acústicos", "Detects acoustic patterns"], ["Integración de sensores", "Sensor integration"], ["De la señal física a una decisión operativa.", "From physical signal to an operational decision."], ["Tecnología que ayuda a entender lo que ocurre en ruta", "Technology that helps understand what happens on the road"], ["Del evento a la información, paso a paso.", "From event to information, step by step."], ["Una plataforma para operar con más contexto.", "A platform to operate with more context."], ["Privacidad de datos", "Data privacy"], ["Términos de servicio", "Terms of service"],
  ["Sigil.IA combina sensores, inteligencia artificial y conectividad para identificar posibles situaciones de riesgo y facilitar el monitoreo de los eventos de tu vehículo.", "Sigil.IA combines sensors, artificial intelligence and connectivity to identify possible risks and make it easier to monitor your vehicle's events."],
  ["Explora cómo el sonido, el movimiento y el peso se integran en el vehículo, se procesan en el borde y llegan a la nube.", "Explore how sound, movement and weight are integrated into the vehicle, processed at the edge and sent to the cloud."],
  ["Una arquitectura edge-computing pensada para procesar micro-patrones de impacto, vibraciones acústicas anómalas y derivas de posición antes de enviar datos al servidor.", "An edge-computing architecture designed to process impact micro-patterns, anomalous acoustic vibrations and position drift before sending data to the server."],
  ["El acceso combina contraseña y un segundo factor facial procesado en el navegador o códigos TOTP de una aplicación autenticadora.", "Access combines a password with a facial second factor processed in the browser or TOTP codes from an authenticator app."],
  ["El análisis facial se ejecuta en el navegador; no se suben fotografías.", "Facial analysis runs in the browser; no photos are uploaded."], ["El descriptor se cifra en el backend antes de guardarse en PostgreSQL.", "The descriptor is encrypted in the backend before being stored in PostgreSQL."], ["Usa una aplicación autenticadora si no puedes verificar tu rostro.", "Use an authenticator app if you cannot verify your face."],
  ["Capturar rostro", "Capture face"], ["Capturar de nuevo", "Capture again"], ["Tomar foto con reconocimiento", "Take photo with recognition"], ["Capturar con reconocimiento", "Capture with recognition"], ["Actualizar foto", "Update photo"], ["Nueva contraseña", "New password"], ["Validar contraseña", "Confirm password"], ["Repite la nueva contraseña", "Repeat the new password"], ["Las contraseñas no coinciden.", "Passwords do not match."], ["Guardar configuración", "Save settings"], ["Guardar configuración", "Save settings"], ["Guardando…", "Saving…"], ["Verificar rostro", "Verify face"], ["Verificar código", "Verify code"], ["Volver", "Back"], ["Volver a verificación facial", "Back to facial verification"], ["Activar cámara", "Activate camera"], ["Reactivar cámara", "Reactivate camera"], ["Usar código autenticador en su lugar", "Use authenticator code instead"], ["Credenciales correctas. Completa el segundo factor.", "Correct credentials. Complete the second factor."], ["Cámara no iniciada", "Camera not started"], ["Cámara activa · detección facial", "Camera active · facial detection"], ["Analizando rostro y señal de vida…", "Analyzing face and liveness…"], ["Rostro enrolado en esta sesión", "Face enrolled in this session"], ["Plantilla facial preparada y cifrada al confirmar.", "Facial template prepared and encrypted when confirmed."],
  ["Acceso restringido a personal autorizado", "Access restricted to authorized personnel"], ["Volver al portal informativo", "Back to information portal"], ["Usar modo claro", "Use light mode"], ["Usar modo oscuro", "Use dark mode"], ["Preferencias de interfaz", "Interface preferences"],
  ["Ejemplo de integración", "Integration example"], ["Ubicación conceptual de sensores y módulos en un vehículo", "Conceptual location of sensors and modules in a vehicle"], ["procesamiento edge", "edge processing"], ["Celda de carga", "Load cell"], ["MIC", "MIC"], ["LOAD", "LOAD"], ["IMU", "IMU"], ["ESP32 Core", "ESP32 Core"],
  ["Sonido · habitáculo", "Sound · cabin"], ["Detecta patrones acústicos anómalos dentro del habitáculo.", "Detects anomalous acoustic patterns inside the cabin."], ["Captura", "Capture"], ["Inferencia", "Inference"], ["Almacenamiento", "Storage"], ["Módulos y sensores", "Modules and sensors"],
  ["01 / EL PROYECTO", "01 / THE PROJECT"], ["02 / CÓMO FUNCIONA", "02 / HOW IT WORKS"], ["03 / FUNCIONES", "03 / FEATURES"], ["INTEGRACIÓN DE SENSORES", "SENSOR INTEGRATION"], ["PREVISTO", "PLANNED"],
  ["Nodo local de bajo consumo y alta frecuencia de muestreo. Lee señales inerciales y acústicas directamente del habitáculo del vehículo.", "Low-power local node with a high sampling rate. It reads inertial and acoustic signals directly from the vehicle cabin."],
  ["Filtrado de falsos positivos mediante algoritmos de agrupamiento estadístico y clasificación en tiempo real.", "False-positive filtering through statistical clustering algorithms and real-time classification."],
  ["Paquetes de telemetría compactados y cifrados hacia AWS IoT Core con persistencia de auditoría.", "Compressed and encrypted telemetry packets sent to AWS IoT Core with audit persistence."],
  ["CAN BUS & I2C Ready", "CAN BUS & I2C Ready"], ["Clasificación on-device", "On-device classification"], ["Cuatro etapas describen cómo está planteado el sistema para transformar señales en contexto operativo.", "Four stages describe how the system is designed to transform signals into operational context."],
  ["El sistema procesa la señal, conserva el contexto y entrega información útil para la operación.", "The system processes the signal, preserves context and delivers useful information for operations."], ["Capacidades pensadas para complementar las decisiones de seguridad y operación de una flota.", "Capabilities designed to support fleet safety and operational decisions."],
  ["Visualiza señales de impacto y comportamientos anómalos.", "View impact signals and anomalous behaviors."], ["Recibe notificaciones ante eventos relevantes.", "Receive notifications for relevant events."], ["Consulta posición y deriva de ruta.", "Check position and route deviation."], ["Conserva una línea de tiempo para auditoría.", "Keep a timeline for auditing."], ["Revisa conectividad, sensores y telemetría.", "Review connectivity, sensors and telemetry."], ["Capa prevista para autorizar acceso a cabina.", "Planned layer for authorizing cabin access."],
  ["Estado del vehículo", "Vehicle status"], ["Status del vehículo", "Vehicle status"], ["Arquitectura de ciberseguridad vehicular inteligente.", "Intelligent vehicle cybersecurity architecture."], ["Soporte SOC de flota", "Fleet SOC support"], ["Protocolos ESP32 & MQTT", "ESP32 & MQTT protocols"], ["© 2025 Sigil.IA.", "© 2025 Sigil.IA."],
  ["Microcontrolador ESP32", "ESP32 microcontroller"], ["Inferencia inteligente", "Intelligent inference"], ["Broker MQTT & Cloud", "MQTT & Cloud broker"], ["Detección de eventos", "Event detection"], ["Análisis inteligente", "Intelligent analysis"], ["Comunicación y almacenamiento", "Communication and storage"], ["Consulta y notificaciones", "Queries and notifications"],
  ["Una plataforma para operar con", "A platform to operate with"], ["más contexto.", "more context."], ["Del evento a la información,", "From event to information,"], ["paso a paso.", "step by step."],
  ["Del evento a la información, paso a paso.", "From event to information, step by step."], ["Una plataforma para operar con más contexto.", "A platform to operate with more context."], ["Monitoreo de eventos", "Event monitoring"], ["Alertas de seguridad", "Security alerts"], ["Ubicación del vehículo", "Vehicle location"], ["Historial de eventos", "Event history"], ["Validación biométrica MFA", "MFA biometric validation"],
  ["Cuatro etapas describen cómo está planteado el sistema para transformar señales en contexto operativo.", "Four stages describe how the system is designed to transform signals into operational context."], ["Capacidades pensadas para complementar las decisiones de seguridad y operación de una flota.", "Capabilities designed to support fleet safety and operational decisions."], ["© 2025 Sigil.IA. Arquitectura de ciberseguridad vehicular inteligente.", "© 2025 Sigil.IA. Intelligent vehicle cybersecurity architecture."],
  ["Portal administrativo Sigil.IA", "Sigil.IA administration portal"], ["Acceso de administrador", "Administrator access"], ["Usa el correo corporativo registrado y tu contraseña.", "Use your registered corporate email and password."], ["Correo corporativo", "Corporate email"], ["Continuar con MFA", "Continue with MFA"], ["Continuar con MFA →", "Continue with MFA →"], ["Configuración MFA", "MFA setup"], ["Confirmar MFA", "Confirm MFA"], ["Iniciar sesión", "Sign in"], ["Crear cuenta", "Create account"], ["¿Olvidaste tu contraseña?", "Forgot your password?"], ["Restablecer contraseña", "Reset password"], ["Restablece tu contraseña", "Reset your password"], ["Verifica tu aplicación autenticadora", "Verify your authenticator app"], ["Ingresa el correo de tu cuenta y el código vigente de seis dígitos de tu aplicación.", "Enter your account email and the current six-digit code from your app."], ["Código autenticador", "Authenticator code"], ["Verificar código", "Verify code"], ["Verificando...", "Verifying..."], ["Código verificado. Ahora puedes crear una nueva contraseña.", "Code verified. You can now create a new password."], ["No fue posible verificar el código autenticador.", "Could not verify the authenticator code."], ["Crea una nueva contraseña", "Create a new password"], ["Nueva contraseña", "New password"], ["Validar contraseña", "Confirm password"], ["Repite la nueva contraseña", "Repeat the new password"], ["Guardar nueva contraseña", "Save new password"], ["Volver al inicio de sesión", "Back to sign in"], ["Elige una contraseña segura para volver a acceder a tu cuenta.", "Choose a secure password to access your account again."], ["La contraseña debe tener entre 12 y 128 caracteres, con mayúsculas, minúsculas y números.", "The password must be 12 to 128 characters and include uppercase, lowercase and numbers."], ["Las contraseñas no coinciden.", "Passwords do not match."], ["Contraseña actualizada. Ya puedes iniciar sesión.", "Password updated. You can now sign in."], ["El enlace no es válido o ya expiró.", "The link is invalid or has expired."],
  ["Actualizado justo ahora", "Updated just now"], ["justo ahora", "just now"], ["Datos de la flota.", "Fleet data."], ["conductores tienen estado activo en PostgreSQL.", "drivers are active in PostgreSQL."], ["Gestionar conductores →", "Manage drivers →"], ["de", "of"], ["registradas", "registered"], ["consulta PostgreSQL", "PostgreSQL query"], ["actualizado desde la API", "updated from the API"], ["API activa", "API active"], ["01 / ACTIVIDAD", "01 / ACTIVITY"], ["Las barras cambian con las alertas recibidas cada día.", "The bars change with alerts received each day."], ["02 / REGISTRO HISTÓRICO", "02 / EVENT HISTORY"], ["Evento", "Event"], ["Conductor", "Driver"], ["Última ubicación", "Last location"], ["Señal", "Signal"], ["CRUD", "CRUD"],
  ["PANEL DE ADMINISTRACIÓN", "ADMINISTRATION PANEL"], ["RESUMEN", "SUMMARY"], ["CONDUCTORES", "DRIVERS"], ["CONFIGURACIÓN", "SETTINGS"], ["SOPORTE", "SUPPORT"], ["CONDUCTOR SELECCIONADO", "SELECTED DRIVER"], ["CUENTA DEL ADMINISTRADOR", "ADMINISTRATOR ACCOUNT"],
  ["Dispositivo ESP32", "ESP32 device"], ["Sin asignar", "Unassigned"], ["Sin asignar ·", "Unassigned ·"], ["Supervisión telemática activa", "Active telematics monitoring"],
  ["Datos de la cuenta", "Account information"], ["Estos datos corresponden al administrador con el que iniciaste sesión; puedes actualizarlos aquí.", "These details belong to the administrator you signed in with; you can update them here."], ["Foto y contraseña", "Photo and password"], ["Seguridad de cuenta", "Account security"], ["Reconocimiento facial y TOTP activos", "Facial recognition and TOTP active"], ["TOTP activo; reconocimiento facial no configurado", "TOTP active; facial recognition not configured"], ["Sin vehículo asociado", "No associated vehicle"], ["Último evento", "Last event"], ["Sin eventos", "No events"], ["Sin actividad registrada", "No activity recorded"], ["Última posición GPS", "Last GPS position"], ["No datos GPS asociados", "No associated GPS data"], ["Contacto directo", "Direct contact"], ["Operativo", "Operational"], ["Cluster MX-01", "Cluster MX-01"],
  ["Ubicación simulada", "Simulated location"], ["Abrir en OpenStreetMap", "Open in OpenStreetMap"], ["La posición GPS no contiene coordenadas válidas.", "The GPS position does not contain valid coordinates."],
  ["CENTRO DE AYUDA", "HELP CENTER"], ["Obtén ayuda para la plataforma, los dispositivos ESP32 y la operación de tu flota.", "Get help with the platform, ESP32 devices and your fleet operations."], ["Reporta fallas de telemetría, conexión o funcionamiento del dashboard.", "Report telemetry, connection or dashboard failures."], ["Consulta cómo administrar conductores, alertas, GPS y registros históricos.", "Learn how to manage drivers, alerts, GPS and historical records."], ["Canal para solicitar asistencia con la instalación o los sensores.", "Channel to request help with installation or sensors."], ["Formulario de incidencia preparado para conectar con soporte.", "Issue form ready to connect with support."], ["La documentación operativa estará disponible en la siguiente versión.", "Operations documentation will be available in the next version."], ["Solicitud de contacto preparada para el equipo técnico.", "Contact request ready for the technical team."], ["Ten a la mano el ID del conductor, dispositivo ESP32, hora del evento y captura de la alerta.", "Have the driver ID, ESP32 device, event time and alert screenshot ready."],
  ["ALTA DE ADMINISTRADOR", "ADMINISTRATOR REGISTRATION"], ["Crea tu cuenta corporativa", "Create your corporate account"], ["Registra tu rostro y activa una aplicación autenticadora antes de crear la cuenta.", "Register your face and activate an authenticator app before creating the account."], ["Confirmar contraseña", "Confirm password"], ["Teléfono", "Phone"], ["Activar cámara", "Activate camera"], ["Cámara activa", "Camera active"], ["Cámara no iniciada", "Camera not started"], ["Entre 12 y 128 caracteres", "Between 12 and 128 characters"], ["Al menos una letra mayúscula", "At least one uppercase letter"], ["Al menos una letra minúscula", "At least one lowercase letter"], ["Al menos un número", "At least one number"], ["Las contraseñas coinciden", "Passwords match"],
  ["01 / CREDENCIALES", "01 / CREDENTIALS"], ["02 / SEGUNDO FACTOR", "02 / SECOND FACTOR"], ["Confirma tu identidad", "Confirm your identity"], ["Verifica el rostro o introduce el código temporal de tu aplicación autenticadora.", "Verify your face or enter the temporary code from your authenticator app."],
  ["El análisis combina descriptor, señal de vida y descriptor facial.", "The analysis combines the descriptor, liveness signal and facial descriptor."], ["Analizando…", "Analyzing…"], ["Mantén el rostro centrado durante el análisis.", "Keep your face centered during the analysis."], ["Código de seis dígitos", "Six-digit code"], ["Código temporal", "Temporary code"], ["Escanea el QR con una aplicación autenticadora. Puedes activar reconocimiento facial ahora o usar TOTP como factor MFA.", "Scan the QR code with an authenticator app. You can activate facial recognition now or use TOTP as your MFA factor."],
  ["Escanea el QR y confirma el código de seis dígitos. Tu plantilla facial ya está cifrada y no se guardó ninguna fotografía.", "Scan the QR code and confirm the six-digit code. Your facial template is already encrypted and no photo was saved."], ["Opcional", "Optional"], ["Enrolar reconocimiento facial", "Enroll facial recognition"], ["Privado", "Private"], ["LOCAL", "LOCAL"], ["PRIVADO", "PRIVATE"], ["ENROLAMIENTO FACIAL", "FACIAL ENROLLMENT"], ["Analizando rostro y señal de vida…", "Analyzing face and liveness…"],
  ["Mantén el rostro centrado. Solo se envía el descriptor facial; no se suben imágenes.", "Keep your face centered. Only the facial descriptor is sent; no images are uploaded."],
  ["Consiento que se procese mi plantilla facial para autenticación MFA. No se almacenará la fotografía.", "I consent to processing my facial template for MFA authentication. The photo will not be stored."], ["Los modelos se ejecutan localmente en el navegador. La plantilla cifrada se usa solo para comparación; el análisis de vida no sustituye un sistema certificado anti-suplantación.", "Models run locally in the browser. The encrypted template is used only for comparison; liveness analysis does not replace a certified anti-spoofing system."], ["Acceso restringido a personal autorizado", "Access restricted to authorized personnel"], ["No fue posible conectar con el backend. Verifica que el servidor esté activo.", "Could not connect to the backend. Verify that the server is running."], ["Debes aceptar el uso de una plantilla facial cifrada para activar este factor.", "You must accept the use of an encrypted facial template to activate this factor."], ["Configura tu aplicación autenticadora para continuar.", "Set up your authenticator app to continue."], ["Verificando…", "Verifying…"], ["Registrando...", "Registering..."], ["Registrar administrador", "Register administrator"],
];

// Additional dashboard labels kept separately so they remain available to the global translator.
pairs.push(["Gestionar conductor", "Manage driver"], ["CONDUCTORES", "DRIVERS"], ["Teléfono", "Phone"], ["Sin teléfono registrado", "No phone registered"], ["Número registrado del conductor", "Driver's registered number"]);
pairs.push(["Acciones", "Actions"], ["Estado operativo", "Operational status"], ["Inactivo", "Inactive"]);
pairs.push(["Correo electrónico", "Email"], ["Sin correo registrado", "No email registered"]);
pairs.push(["Estado operativo del conductor", "Driver operational status"]);
pairs.push(["Contactar conductor", "Contact driver"], ["Llamar ahora", "Call now"], ["Se abrirá la aplicación de llamadas disponible en este equipo.", "The calling application available on this computer will open."]);
pairs.push(["Lunes", "Monday"], ["Martes", "Tuesday"], ["Miércoles", "Wednesday"], ["Jueves", "Thursday"], ["Viernes", "Friday"], ["Sábado", "Saturday"], ["Domingo", "Sunday"], ["Hoy", "Today"]);
pairs.push(["01 / CONDUCTORES", "01 / DRIVERS"]);

const translations = Object.fromEntries(pairs) as Record<string, string>;
const reverseTranslations = Object.fromEntries(pairs.map(([es, en]) => [en, es])) as Record<string, string>;
const originalText = new WeakMap<Text, string>();
const renderedText = new WeakMap<Text, string>();

function replaceTranslations(value: string, entries: Array<[string, string]>) {
  let result = value;
  for (const [source, target] of entries) {
    if (/^[\p{L}\d]+$/u.test(source)) {
      result = result.replace(new RegExp(`(?<![\\p{L}\\d])${source}(?![\\p{L}\\d])`, "gu"), target);
    } else {
      result = result.split(source).join(target);
    }
  }
  return result;
}

function translateDocument(language: "es" | "en") {
  const dictionary = language === "en" ? translations : reverseTranslations;
  const entries = Object.entries(dictionary).sort(([a], [b]) => b.length - a.length);
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) nodes.push(node as Text);
  for (const textNode of nodes) {
    const current = textNode.nodeValue ?? "";
    let original = originalText.get(textNode);
    if (!original || renderedText.get(textNode) !== current) {
      original = current;
      originalText.set(textNode, original);
    }
    const translated = replaceTranslations(original, entries);
    renderedText.set(textNode, translated);
    if (translated !== current) textNode.nodeValue = translated;
  }
  document.querySelectorAll<HTMLElement>("[placeholder], [aria-label], [title]").forEach((element) => {
    for (const attribute of ["placeholder", "aria-label", "title"]) {
      const original = element.getAttribute(attribute);
      if (!original) continue;
      const translated = replaceTranslations(original, entries);
      if (translated !== original) element.setAttribute(attribute, translated);
    }
  });
}

export function LanguageSync() {
  useEffect(() => {
    const language = window.localStorage.getItem("sigil-language") === "en" ? "en" : "es";
    document.documentElement.lang = language;
    document.documentElement.dataset.theme = "light";
    translateDocument(language);
    const observer = new MutationObserver(() => window.requestAnimationFrame(() => {
      const currentLanguage = window.localStorage.getItem("sigil-language") === "en" ? "en" : "es";
      translateDocument(currentLanguage);
    }));
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);
  return null;
}

export function Preferences({ inHeader = false }: { inHeader?: boolean }) {
  const [language, setLanguage] = useState<"es" | "en">("es");
  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("sigil-language") === "en" ? "en" : "es";
    setLanguage(savedLanguage);
    document.documentElement.lang = savedLanguage;
    translateDocument(savedLanguage);
  }, []);
  const changeLanguage = (next: "es" | "en") => { setLanguage(next); window.localStorage.setItem("sigil-language", next); document.documentElement.lang = next; translateDocument(next); };
  return <div className={`sigil-preferences ${!inHeader ? "sigil-preferences-page" : ""}`} aria-label="Preferencias de interfaz">
    <select className="sigil-language" value={language} onChange={(event) => changeLanguage(event.target.value as "es" | "en")} aria-label="Cambiar idioma" title="Cambiar idioma">
      <option value="es">Español</option>
      <option value="en">English</option>
    </select>
  </div>;
}
