"use client";

import { useState, useSyncExternalStore } from "react";
import styles from "./cookie-consent.module.css";
import {
  applyInterfacePreferences,
  clearInterfacePreferences,
  persistInterfacePreferences,
  type InterfaceLanguage,
  type InterfaceTheme,
} from "../preferences";

type OptionalConsent = {
  analytics: boolean;
  preferences: boolean;
};

const COOKIE_NAME = "sigil_cookie_consent";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

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
  const consentValue = useSyncExternalStore(subscribeToConsent, getConsentValue, () => null);
  const uiPreferences = useSyncExternalStore(subscribeToUiPreferences, getAppliedUiPreferences, () => "es-light");
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [preferences, setPreferences] = useState(false);
  const [language, theme] = uiPreferences.split("-") as [InterfaceLanguage, InterfaceTheme];
  const [saveError, setSaveError] = useState("");

  function saveConsent(nextConsent: OptionalConsent) {
    const value = nextConsent.analytics && nextConsent.preferences
      ? "all"
      : nextConsent.analytics || nextConsent.preferences
        ? `custom-${Number(nextConsent.analytics)}-${Number(nextConsent.preferences)}`
        : "essential";
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
    window.dispatchEvent(new Event("sigil:cookie-consent"));
  }

  if (consentValue !== null) return null;

  return (
    <aside className={styles.banner} aria-label="Consentimiento de cookies">
      <div className={styles.copy}>
        <p className={styles.eyebrow}>Tu privacidad importa</p>
        <h2>Consentimiento de cookies</h2>
        <p>
          Usamos cookies necesarias para que el sitio funcione. Si lo autorizas,
          también podremos usar cookies de preferencias y análisis. Puedes cambiar
          las categorías opcionales antes de guardar tu elección.
        </p>
      </div>

      {customizing && (
        <div id="cookie-preferences" className={styles.preferences} aria-label="Preferencias de cookies">
          <label className={styles.preference}>
            <span><strong>Cookies necesarias</strong><small>Requeridas para el funcionamiento del sitio.</small></span>
            <input type="checkbox" checked disabled aria-label="Cookies necesarias activas" />
          </label>
          <label className={styles.preference}>
            <span><strong>Cookies de preferencias</strong><small>Recuerdan opciones como el idioma o la apariencia.</small></span>
            <input type="checkbox" checked={preferences} onChange={(event) => setPreferences(event.target.checked)} />
          </label>
          <div className={styles.interfacePreferences}>
            <label htmlFor="cookie-language">Idioma de la página</label>
            <select
              id="cookie-language"
              value={language}
              disabled={!preferences}
              onChange={(event) => {
                const nextLanguage = event.target.value as InterfaceLanguage;
                applyInterfacePreferences({ language: nextLanguage, theme });
              }}
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
            <label htmlFor="cookie-theme">Apariencia de la página</label>
            <select
              id="cookie-theme"
              value={theme}
              disabled={!preferences}
              onChange={(event) => {
                const nextTheme = event.target.value as InterfaceTheme;
                applyInterfacePreferences({ language, theme: nextTheme });
              }}
            >
              <option value="light">Claro</option>
              <option value="dark">Oscuro</option>
            </select>
            <small>Activa las cookies de preferencias para guardar estos cambios.</small>
          </div>
          <label className={styles.preference}>
            <span><strong>Cookies de análisis</strong><small>Ayudan a comprender cómo se utiliza el sitio.</small></span>
            <input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} />
          </label>
        </div>
      )}

      {saveError && <p className={styles.error} role="alert">{saveError}</p>}

      <div className={styles.actions}>
        {!customizing ? (
          <>
            <button className={styles.secondaryButton} onClick={() => saveConsent({ analytics: false, preferences: false })}>
              Aceptar solo las necesarias
            </button>
            <button className={styles.secondaryButton} aria-expanded={false} aria-controls="cookie-preferences" onClick={() => setCustomizing(true)}>
              Personalizar
            </button>
            <button className={styles.primaryButton} onClick={() => saveConsent({ analytics: true, preferences: true })}>
              Aceptar todas
            </button>
          </>
        ) : (
          <>
            <button className={styles.secondaryButton} aria-expanded={customizing} aria-controls="cookie-preferences" onClick={() => setCustomizing(false)}>
              Ocultar opciones
            </button>
            <button className={styles.primaryButton} onClick={() => saveConsent({ analytics, preferences })}>
              Guardar preferencias
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
