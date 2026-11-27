"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import styles from "./cookie-consent.module.css";

type OptionalConsent = {
  analytics: boolean;
};

type CookieCategory = "necessary" | "services" | "analytics";

const COOKIE_NAME = "sigil_cookie_consent";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180;
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function getConsentValue() {
  const cookie = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${COOKIE_NAME}=`));

  if (!cookie) return null;

  const value = cookie.slice(COOKIE_NAME.length + 1);
  return value === "essential" || value === "all" || /^custom-[01]-[01]$/.test(value)
    ? value
    : null;
}

function allowsAnalytics(value: string | null) {
  return value === "all" || /^custom-[01]-1$/.test(value ?? "");
}

function subscribeToConsent(callback: () => void) {
  window.addEventListener("sigil:cookie-consent", callback);
  return () => window.removeEventListener("sigil:cookie-consent", callback);
}

export default function CookieConsent() {
  const consentValue = useSyncExternalStore(subscribeToConsent, getConsentValue, () => "pending");
  const [customizing, setCustomizing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [category, setCategory] = useState<CookieCategory>("necessary");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (consentValue === "pending" || consentValue !== null) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [consentValue]);

  useEffect(() => {
    function openCookieSettings() {
      if (consentValue === null || consentValue === "pending") return;
      setAnalytics(allowsAnalytics(consentValue));
      setCategory("necessary");
      setSettingsOpen(true);
      setCustomizing(true);
    }

    window.addEventListener("sigil:open-cookie-settings", openCookieSettings);
    return () => window.removeEventListener("sigil:open-cookie-settings", openCookieSettings);
  }, [consentValue]);

  function saveConsent(nextConsent: OptionalConsent) {
    const value = nextConsent.analytics ? "all" : "essential";
    const previousConsent = getConsentValue();
    const secure = window.location.protocol === "https:" ? "; Secure" : "";

    document.cookie = `${COOKIE_NAME}=${value}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;

    if (getConsentValue() !== value) {
      setSaveError("No pudimos guardar tu elección. Revisa la configuración de cookies de tu navegador e inténtalo de nuevo.");
      return;
    }

    setSaveError("");
    setSettingsOpen(false);
    setCustomizing(false);
    window.dispatchEvent(new Event("sigil:cookie-consent"));

    void fetch(`${API_URL}/api/privacy/cookies/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision: value,
        analytics: nextConsent.analytics,
        version: "1.0",
        source: previousConsent === null ? "initial" : "updated",
      }),
      keepalive: true,
    }).catch(() => {
      // La decisión local sigue siendo válida aunque el backend no esté disponible.
    });
  }

  if (consentValue === "pending") return null;

  if (consentValue !== null && !settingsOpen) return null;

  return (
    <div className={styles.backdrop} role="presentation">
      <aside
        className={styles.banner}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-consent-title"
        aria-label="Consentimiento de cookies"
      >
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Tu privacidad importa</p>
          <h2 id="cookie-consent-title">Consentimiento de cookies</h2>
          <p>
            Usamos cookies técnicas necesarias para el funcionamiento y la seguridad del sitio.
            Si lo autorizas, Google Analytics 4 utilizará cookies analíticas para elaborar
            estadísticas agregadas. Los servicios externos se solicitan únicamente bajo demanda.
          </p>
        </div>

        {customizing && (
          <div id="cookie-preferences" className={styles.preferences} aria-label="Configuración de cookies">
            <nav className={styles.categoryNav} aria-label="Categorías de cookies">
              {([
                ["necessary", "Cookies para el funcionamiento de la web"],
                ["services", "Cookies para servicios"],
                ["analytics", "Cookies analíticas"],
              ] as Array<[CookieCategory, string]>).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={category === id ? styles.categoryActive : styles.categoryButton}
                  onClick={() => setCategory(id)}
                >
                  {label}
                </button>
              ))}
            </nav>

            <div className={styles.categoryPanel}>
              {category === "necessary" && <>
                <p className={styles.categoryIntro}>Son necesarias para controlar el aviso de consentimiento, conservar la sesión y proteger el portal.</p>
                <CookieStatusRow title="Aviso de consentimiento" description="Recuerda la decisión elegida para no mostrar el aviso en cada visita durante 180 días." status="Siempre activas" />
                <CookieStatusRow title="Sesión administrativa" description="La autenticación se conserva temporalmente en sessionStorage y se elimina al cerrar sesión." status="Siempre activas" />
                <CookieStatusRow title="Seguridad perimetral" description="Cloudflare ayuda a filtrar tráfico malicioso y mitigar ataques DDoS." status="Siempre activas" />
              </>}

              {category === "services" && <>
                <p className={styles.categoryIntro}>No se cargan para analizar tu navegación. Solo se solicitan cuando un usuario autorizado utiliza la función correspondiente.</p>
                <CookieStatusRow title="OpenStreetMap" description="Muestra la ubicación GPS cuando el administrador consulta un conductor con un evento activo." status="Bajo demanda" />
              </>}

              {category === "analytics" && <>
                <p className={styles.categoryIntro}>Permiten obtener estadísticas agregadas para mejorar la plataforma. Permanecen desactivadas hasta que otorgues tu consentimiento.</p>
                <label className={styles.preferenceToggle}>
                  <span><strong>Google Analytics 4</strong><small>Mide visitas, interacciones y datos técnicos de navegación con cookies analíticas opcionales.</small></span>
                  <input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} />
                </label>
                <CookieStatusRow title="Cookies publicitarias" description="Sigilia no crea perfiles publicitarios ni comparte datos de navegación con anunciantes." status="No utilizadas" />
              </>}
            </div>
          </div>
        )}

        {saveError && <p className={styles.error} role="alert">{saveError}</p>}

        <div className={styles.actions}>
          {!customizing ? (
            <>
              <button className={styles.secondaryButton} onClick={() => saveConsent({ analytics: false })}>
                Rechazar cookies opcionales
              </button>
              <button className={styles.secondaryButton} aria-expanded={false} aria-controls="cookie-preferences" onClick={() => setCustomizing(true)}>
                Personalizar
              </button>
              <button className={styles.primaryButton} onClick={() => saveConsent({ analytics: true })}>
                Aceptar cookies analíticas
              </button>
            </>
          ) : (
            <>
              <button className={styles.secondaryButton} aria-expanded={customizing} aria-controls="cookie-preferences" onClick={() => setCustomizing(false)}>
                Ocultar opciones
              </button>
              <button className={styles.primaryButton} onClick={() => saveConsent({ analytics })}>
                Guardar preferencias
              </button>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function CookieStatusRow({ title, description, status }: { title: string; description: string; status: string }) {
  return <div className={styles.statusRow}><div><strong>{title}</strong><small>{description}</small></div><span>{status}</span></div>;
}
