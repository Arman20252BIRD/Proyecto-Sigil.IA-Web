"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError, login, register } from "@/lib/api/client";
import styles from "./page.module.css";

type Tab = "login" | "register";
type FaceState = "idle" | "camera" | "captured";

export default function AuthPanel() {
  const [tab, setTab] = useState<Tab>("login");
  const [loginStep, setLoginStep] = useState<1 | 2>(1);
  const [faceState, setFaceState] = useState<FaceState>("idle");
  const [challengeId, setChallengeId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(
    () => () => streamRef.current?.getTracks().forEach((track) => track.stop()),
    [],
  );

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function startCamera() {
    setNotice("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setNotice(
        "Este navegador no permite acceder a la cámara. La verificación biométrica real requiere integrar el backend.",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setFaceState("camera");
    } catch {
      setNotice(
        "No se concedió acceso a la cámara. La verificación biométrica requiere una integración real con el backend.",
      );
    }
  }

  function captureFace() {
    stopCamera();
    setFaceState("captured");
    setNotice(
      "Acción visual de demostración: no se capturó, envió ni validó información biométrica.",
    );
  }

  async function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = getStringValue(formData, "email");
    const password = getStringValue(formData, "password");

    try {
      const challenge = await login({
        email,
        password,
        rememberDevice: formData.get("rememberDevice") === "on",
      });

      setChallengeId(challenge.challengeId);
      setLoginStep(2);
      setFaceState("idle");
      setNotice(
        "El servidor emitió un reto de acceso. La verificación facial y la creación de la sesión todavía deben integrarse.",
      );
    } catch (error) {
      setNotice(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");

    const formData = new FormData(event.currentTarget);
    const password = getStringValue(formData, "password");

    if (password !== getStringValue(formData, "confirm")) {
      setNotice("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        fullName: getStringValue(formData, "name"),
        companyName: getStringValue(formData, "company"),
        email: getStringValue(formData, "email"),
        phone: getStringValue(formData, "phone"),
        password,
      });
      setNotice(
        "El servidor recibió la solicitud. El enrolamiento biométrico real y la activación de la cuenta siguen pendientes.",
      );
    } catch (error) {
      setNotice(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function selectTab(nextTab: Tab) {
    stopCamera();
    setTab(nextTab);
    setLoginStep(1);
    setChallengeId("");
    setFaceState("idle");
    setNotice("");
  }

  function resetLogin() {
    stopCamera();
    setLoginStep(1);
    setChallengeId("");
    setFaceState("idle");
    setNotice("");
  }

  return (
    <section className={styles.panel}>
      <div className={styles.tabs}>
        <button
          className={tab === "login" ? styles.tabActive : ""}
          onClick={() => selectTab("login")}
          type="button"
        >
          Iniciar sesión
        </button>
        <button
          className={tab === "register" ? styles.tabActive : ""}
          onClick={() => selectTab("register")}
          type="button"
        >
          Crear cuenta
        </button>
      </div>

      {tab === "login" ? (
        loginStep === 1 ? (
          <form className={styles.form} onSubmit={submitLogin}>
            <FormHeader
              step="01 / CREDENCIALES"
              title="Acceso de administrador"
              text="Usa el correo corporativo registrado y tu contraseña maestra."
            />
            <Field
              label="Correo corporativo"
              name="email"
              type="email"
              placeholder="admin@empresa.com"
            />
            <Field
              label="Contraseña"
              name="password"
              type="password"
              placeholder="Tu contraseña"
            />
            <label className={styles.check}>
              <input name="rememberDevice" type="checkbox" /> Recordar esta
              terminal <a href="#ayuda">¿Olvidaste tu contraseña?</a>
            </label>
            <button
              className={styles.primaryButton}
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Conectando con la API..." : "Continuar con MFA"}
              <span>→</span>
            </button>
          </form>
        ) : (
          <FaceStep
            challengeId={challengeId}
            onBack={resetLogin}
            onStart={startCamera}
            onVerify={captureFace}
            videoRef={videoRef}
            faceState={faceState}
          />
        )
      ) : (
        <form className={styles.form} onSubmit={submitRegister}>
          <FormHeader
            step="ALTA DE ADMINISTRADOR"
            title="Crea tu cuenta corporativa"
            text="Completa tus datos. La activación y el enrolamiento real requieren el backend."
          />
          <div className={styles.fieldGrid}>
            <Field
              label="Nombre completo"
              name="name"
              placeholder="Nombre y apellidos"
            />
            <Field
              label="Empresa"
              name="company"
              placeholder="Nombre de la empresa"
            />
            <Field
              label="Correo corporativo"
              name="email"
              type="email"
              placeholder="admin@empresa.com"
            />
            <Field
              label="Teléfono"
              name="phone"
              type="tel"
              placeholder="+52 000 000 0000"
            />
            <Field
              label="Contraseña"
              name="password"
              type="password"
              placeholder="Mínimo 12 caracteres"
              minLength={12}
            />
            <Field
              label="Confirmar contraseña"
              name="confirm"
              type="password"
              placeholder="Repite la contraseña"
            />
          </div>
          <div className={styles.faceBox}>
            <div className={styles.faceHeader}>
              <div>
                <span>02 / ENROLAMIENTO</span>
                <h3>Verificación facial pendiente</h3>
              </div>
            </div>
            <CameraFrame videoRef={videoRef} faceState={faceState} />
            <div className={styles.faceActions}>
              {faceState === "idle" ? (
                <button
                  type="button"
                  className={styles.outlineButton}
                  onClick={startCamera}
                >
                  Activar cámara
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.outlineButton}
                  onClick={captureFace}
                >
                  Vista previa de demostración
                </button>
              )}
              <small>
                La cámara es solo una vista previa; no se recopilan datos
                biométricos.
              </small>
            </div>
          </div>
          <button
            className={styles.primaryButton}
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Conectando con la API..." : "Registrar administrador"}
            <span>→</span>
          </button>
        </form>
      )}

      {notice && (
        <p className={styles.notice} role="status" aria-live="polite">
          {notice}
        </p>
      )}
      <p className={styles.panelFoot}>
        El acceso y el registro requieren un backend de autenticación conectado.
      </p>
    </section>
  );
}

function getStringValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Ocurrió un error inesperado al comunicarse con la API.";
}

function FormHeader({
  step,
  title,
  text,
}: {
  step: string;
  title: string;
  text: string;
}) {
  return (
    <div className={styles.formHeader}>
      <span>{step}</span>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder: string;
  minLength?: number;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        minLength={minLength}
        required
        autoComplete={getAutoComplete(name)}
      />
    </label>
  );
}

function getAutoComplete(name: string) {
  const values: Record<string, string> = {
    email: "email",
    password: "current-password",
    confirm: "new-password",
    name: "name",
    company: "organization",
    phone: "tel",
  };

  return values[name];
}

function CameraFrame({
  videoRef,
  faceState,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  faceState: FaceState;
}) {
  return (
    <div className={styles.camera}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={faceState === "camera" ? styles.videoVisible : ""}
      />
      <div className={styles.faceGuide}>
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className={styles.cameraLabel}>
        {faceState === "camera"
          ? "Cámara lista · vista previa"
          : faceState === "captured"
            ? "Demostración local · no verificada"
            : "Cámara no iniciada"}
      </div>
    </div>
  );
}

function FaceStep({
  challengeId,
  onBack,
  onStart,
  onVerify,
  videoRef,
  faceState,
}: {
  challengeId: string;
  onBack: () => void;
  onStart: () => void;
  onVerify: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  faceState: FaceState;
}) {
  return (
    <div className={styles.form}>
      <FormHeader
        step="02 / RETO MFA"
        title="Confirma tu identidad"
        text="El backend emitió un reto. Falta integrar la verificación facial real."
      />
      <CameraFrame videoRef={videoRef} faceState={faceState} />
      <div
        className={styles.mfaStatus}
        data-challenge-id={challengeId}
        aria-live="polite"
      >
        <i /> Verificación biométrica y sesión pendientes
      </div>
      <div className={styles.mfaActions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onBack}
        >
          Volver
        </button>
        {faceState === "idle" ? (
          <button
            type="button"
            className={styles.primaryButton}
            onClick={onStart}
          >
            Activar cámara <span>→</span>
          </button>
        ) : (
          <button
            type="button"
            className={styles.primaryButton}
            onClick={onVerify}
          >
            Ver vista previa <span>→</span>
          </button>
        )}
      </div>
    </div>
  );
}
