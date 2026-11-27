"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import styles from "./cookie-consent.module.css";
import {
  applyInterfacePreferences,
  clearInterfacePreferences,
  persistInterfacePreferences,
  type InterfaceLanguage,
  type InterfaceTheme,
} from "../preferencias";

type OptionalConsent = { preferences: boolean; analytics: boolean };
type CookieCategory = "necessary" | "preferences" | "services" | "analytics";

const COOKIE_NAME = "sigil_cookie_consent";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180;
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function getConsentValue() {
  const cookie = document.cookie.split(";").map((entry) => entry.trim()).find((entry) => entry.startsWith(`${COOKIE_NAME}=`));
  if (!cookie) return null;
  const value = cookie.slice(COOKIE_NAME.length + 1);
  return value === "essential" || value === "all" || /^custom-[01]-[01]$/.test(value) ? value : null;
}

function allowsPreferences(value: string | null) {
  if (value === "all") return true;
  return /^custom-1-[01]$/.test(value ?? "");
}

function allowsAnalytics(value: string | null) {
  return value === "all" || /^custom-[01]-1$/.test(value ?? "");
}

function subscribeToConsent(callback: () => void) {
  window.addEventListener("sigil:cookie-consent", callback);
  return () => window.removeEventListener("sigil:cookie-consent", callback);
}

function subscribeToUiPreferences(callback: () => void) {
  window.addEventListener("sigil:ui-preferences", callback);
  return () => window.removeEventListener("sigil:ui-preferences", callback);
}

function getAppliedUiPreferences() {
  const language = document.documentElement.lang === "en" ? "en" : "es";
  const theme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  return `${language}-${theme}`;
}

export default function CookieConsent() {
  const consentValue = useSyncExternalStore(subscribeToConsent, getConsentValue, () => "pending");
  const uiPreferences = useSyncExternalStore(subscribeToUiPreferences, getAppliedUiPreferences, () => "es-light");
  const [customizing, setCustomizing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [category, setCategory] = useState<CookieCategory>("necessary");
  const [language, theme] = uiPreferences.split("-") as [InterfaceLanguage, InterfaceTheme];
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (consentValue === "pending" || consentValue !== null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [consentValue]);

  useEffect(() => {
    function openCookieSettings() {
      if (consentValue === null || consentValue === "pending") return;
      setPreferences(allowsPreferences(consentValue));
      setAnalytics(allowsAnalytics(consentValue));
      setCategory("necessary");
      setSettingsOpen(true);
      setCustomizing(true);
    }
    window.addEventListener("sigil:open-cookie-settings", openCookieSettings);
    return () => window.removeEventListener("sigil:open-cookie-settings", openCookieSettings);
  }, [consentValue]);

  function saveConsent(nextConsent: OptionalConsent) {
    const value = nextConsent.preferences && nextConsent.analytics
      ? "all"
      : !nextConsent.preferences && !nextConsent.analytics
        ? "essential"
        : `custom-${nextConsent.preferences ? "1" : "0"}-${nextConsent.analytics ? "1" : "0"}`;
    const previousConsent = getConsentValue();
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${COOKIE_NAME}=${value}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;

    if (getConsentValue() !== value) {
      setSaveError("No pudimos guardar tu elección. Revisa la configuración de cookies de tu navegador e inténtalo de nuevo.");
      return;
    }

    if (nextConsent.preferences) {
      if (!persistInterfacePreferences({ language, theme })) {
        document.cookie = `${COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
        clearInterfacePreferences();
        setSaveError("No pudimos guardar tus preferencias de idioma y apariencia. Revisa la configuración de cookies de tu navegador e inténtalo de nuevo.");
        return;
      }
    } else {
      clearInterfacePreferences();
      applyInterfacePreferences({ language: "es", theme: "light" });
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
        preferences: nextConsent.preferences,
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
      <aside className={styles.banner} role="dialog" aria-modal="true" aria-labelledby="cookie-consent-title" aria-label="Consentimiento de cookies">
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Tu privacidad importa</p>
          <h2 id="cookie-consent-title">Consentimiento de cookies</h2>
          <p>Usamos cookies necesarias para que el sitio funcione. Si lo autorizas, también podremos usar cookies de preferencias y analíticas para recordar el idioma, la apariencia y medir el uso general del sitio. Puedes cambiar tu elección antes de guardarla.</p>
        </div>

        {customizing && (
          <div id="cookie-preferences" className={styles.preferences} aria-label="Configuración de cookies">
            <nav className={styles.categoryNav} aria-label="Categorías de cookies">
              {([
                ["necessary", "Cookies para el funcionamiento de la web"],
                ["preferences", "Cookies de preferencias"],
                ["services", "Cookies para servicios"],
                ["analytics", "Cookies analíticas"],
              ] as Array<[CookieCategory, string]>).map(([id, label]) => (
                <button key={id} type="button" className={category === id ? styles.categoryActive : styles.categoryButton} onClick={() => setCategory(id)}>{label}</button>
              ))}
            </nav>
            <div className={styles.categoryPanel}>
              {category === "necessary" && <>
                <p className={styles.categoryIntro}>Son necesarias para controlar el aviso de consentimiento, conservar la sesión y proteger el portal.</p>
                <CookieStatusRow title="Aviso de consentimiento" description="Recuerda la decisión elegida para no mostrar el aviso en cada visita durante 180 días." status="Siempre activas" />
                <CookieStatusRow title="Sesión administrativa" description="La autenticación se conserva temporalmente en sessionStorage y se elimina al cerrar sesión." status="Siempre activas" />
                <CookieStatusRow title="Seguridad perimetral" description="La infraestructura puede utilizar protección técnica para filtrar tráfico malicioso y mitigar ataques DDoS." status="Siempre activas" />
              </>}
              {category === "preferences" && <>
                <p className={styles.categoryIntro}>Se utilizan para recordar las opciones de personalización que elijas en la interfaz.</p>
                <label className={styles.preferenceToggle}><span><strong>Cookies de idioma y apariencia</strong><small>Permiten conservar el idioma y el modo claro u oscuro.</small></span><input type="checkbox" checked={preferences} onChange={(event) => setPreferences(event.target.checked)} /></label>
                <div className={styles.interfacePreferences}>
                  <label htmlFor="cookie-language">Idioma de la página</label>
                  <select id="cookie-language" value={language} disabled={!preferences} onChange={(event) => applyInterfacePreferences({ language: event.target.value as InterfaceLanguage, theme })}><option value="es">Español</option><option value="en">English</option></select>
                  <label htmlFor="cookie-theme">Apariencia de la página</label>
                  <select id="cookie-theme" value={theme} disabled={!preferences} onChange={(event) => applyInterfacePreferences({ language, theme: event.target.value as InterfaceTheme })}><option value="light">Claro</option><option value="dark">Oscuro</option></select>
                  <small>Si no las aceptas, la página utilizará español y modo claro.</small>
                </div>
              </>}
              {category === "services" && <>
                <p className={styles.categoryIntro}>Estos servicios no se cargan para analizar tu navegación. Solo se solicitan cuando utilizas una función específica.</p>
                <CookieStatusRow title="Gmail API / OAuth" description="Prepara y envía solicitudes de derechos ARCO desde la cuenta autorizada." status="Bajo demanda" />
                <CookieStatusRow title="OpenStreetMap" description="Muestra la ubicación GPS cuando consultas un conductor con un evento activo." status="Bajo demanda" />
              </>}
              {category === "analytics" && <>
                <p className={styles.categoryIntro}>Se utilizan, con tu autorización, para obtener estadísticas generales de uso y mejorar la plataforma. No se emplean para publicidad personalizada.</p>
                <label className={styles.preferenceToggle}><span><strong>Google Analytics 4</strong><small>Permite medir visitas, interacciones y datos técnicos de navegación.</small></span><input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} /></label>
                <CookieStatusRow title="Cookies publicitarias" description="Sigilia no crea perfiles publicitarios ni comparte datos de navegación con anunciantes." status="No utilizadas" />
              </>}
            </div>
          </div>
        )}

        {saveError && <p className={styles.error} role="alert">{saveError}</p>}
        <div className={styles.actions}>
          {!customizing ? <>
            <button className={styles.secondaryButton} onClick={() => saveConsent({ preferences: false, analytics: false })}>Rechazar cookies opcionales</button>
            <button className={styles.secondaryButton} aria-expanded={false} aria-controls="cookie-preferences" onClick={() => setCustomizing(true)}>Personalizar</button>
            <button className={styles.primaryButton} onClick={() => saveConsent({ preferences: true, analytics: true })}>Aceptar todas</button>
          </> : <>
            <button className={styles.secondaryButton} aria-expanded={customizing} aria-controls="cookie-preferences" onClick={() => setCustomizing(false)}>Ocultar opciones</button>
            <button className={styles.primaryButton} onClick={() => saveConsent({ preferences, analytics })}>Guardar preferencias</button>
          </>}
        </div>
      </aside>
    </div>
  );
}

function CookieStatusRow({ title, description, status }: { title: string; description: string; status: string }) {
  return <div className={styles.statusRow}><div><strong>{title}</strong><small>{description}</small></div><span>{status}</span></div>;
}
