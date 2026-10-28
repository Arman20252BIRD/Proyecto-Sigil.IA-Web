"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useRouter } from "next/navigation";
import { captureLiveFaceDescriptor, captureVideoFrame, trackLiveFaceBox, type DetectedFaceBox } from "./face-recognition";
import styles from "./page.module.css";

type Tab = "login" | "register";
type FaceState = "idle" | "camera" | "processing" | "captured";
type Enrollment = { token: string; otpAuthUrl: string };
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type PasswordRequirements = {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
};

function getPasswordRequirements(password: string): PasswordRequirements {
  return {
    length: password.length >= 12 && password.length <= 128,
    uppercase: /\p{Lu}/u.test(password),
    lowercase: /\p{Ll}/u.test(password),
    number: /\p{N}/u.test(password),
  };
}

type AuthResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  token?: string;
  mfaToken?: string;
  setupToken?: string;
  enrollmentToken?: string;
  otpAuthUrl?: string;
  enrollmentRequired?: boolean;
  facialMfaEnabled?: boolean;
};

export default function AuthPanel() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("login");
  const [loginStep, setLoginStep] = useState<1 | 2>(1);
  const [faceState, setFaceState] = useState<FaceState>("idle");
  const [notice, setNotice] = useState("");
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mfaToken, setMfaToken] = useState("");
  const [setupEnrollment, setSetupEnrollment] = useState<Enrollment | null>(null);
  const [pendingRegistration, setPendingRegistration] = useState<Enrollment | null>(null);
  const [facialMfaEnabled, setFacialMfaEnabled] = useState(false);
  const [verificationMode, setVerificationMode] = useState<"face" | "totp">("face");
  const [otpCode, setOtpCode] = useState("");
  const [capturedFaceDescriptor, setCapturedFaceDescriptor] = useState<number[] | null>(null);
  const [capturedProfilePhoto, setCapturedProfilePhoto] = useState<string | null>(null);
  const [registrationPassword, setRegistrationPassword] = useState("");
  const [registrationPasswordConfirm, setRegistrationPasswordConfirm] = useState("");
  const [detectedFaceBox, setDetectedFaceBox] = useState<DetectedFaceBox | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceTrackingAbortRef = useRef<AbortController | null>(null);
  const passwordRequirements = getPasswordRequirements(registrationPassword);
  const passwordsMatch = registrationPassword.length > 0
    && registrationPassword === registrationPasswordConfirm;

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("reset_token");
    if (token) setResetToken(token);
  }, []);

  function stopCamera() {
    faceTrackingAbortRef.current?.abort();
    faceTrackingAbortRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setDetectedFaceBox(null);
    setFaceState("idle");
  }

  async function startCamera() {
    setNotice("");
    setCapturedFaceDescriptor(null);
    setCapturedProfilePhoto(null);
    setDetectedFaceBox(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setNotice("Este navegador no permite usar la cámara. Usa el código autenticador o prueba con HTTPS/localhost.");
      return;
    }

    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (!videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        throw new Error("No se encontró el reproductor de cámara.");
      }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      const trackingController = new AbortController();
      faceTrackingAbortRef.current = trackingController;
      void trackLiveFaceBox(videoRef.current, setDetectedFaceBox, trackingController.signal).catch(() => {
        if (!trackingController.signal.aborted) setDetectedFaceBox(null);
      });
      setFaceState("camera");
      setNotice("Cámara activa. Mira al frente y mantén el rostro centrado durante el análisis.");
    } catch (error) {
      stopCamera();
      setNotice(error instanceof Error ? error.message : "No se pudo acceder a la cámara.");
    }
  }

  async function captureFace(): Promise<number[] | null> {
    const video = videoRef.current;
    if (!video || !streamRef.current || (faceState !== "camera" && faceState !== "captured")) {
      setNotice("Activa la cámara antes de iniciar la captura.");
      return null;
    }

    setFaceState("processing");
    faceTrackingAbortRef.current?.abort();
    faceTrackingAbortRef.current = null;
    try {
      return await captureLiveFaceDescriptor(video, setNotice, setDetectedFaceBox);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No fue posible analizar el rostro.");
      return null;
    } finally {
      setDetectedFaceBox(null);
      if (streamRef.current && videoRef.current) {
        const trackingController = new AbortController();
        faceTrackingAbortRef.current = trackingController;
        void trackLiveFaceBox(videoRef.current, setDetectedFaceBox, trackingController.signal).catch(() => {
          if (!trackingController.signal.aborted) setDetectedFaceBox(null);
        });
      }
      setFaceState(streamRef.current ? "camera" : "idle");
    }
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${API_URL}/api/auth/login-step1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.get("email"), password: formData.get("password") }),
      });
      const result: AuthResponse = await response.json();

      if (!response.ok || !result.success) {
        setNotice(result.error ?? "No fue posible validar las credenciales.");
        return;
      }

      setLoginStep(2);
      setOtpCode("");
      if (result.enrollmentRequired && result.setupToken && result.otpAuthUrl) {
        setSetupEnrollment({ token: result.setupToken, otpAuthUrl: result.otpAuthUrl });
        setMfaToken("");
        setFacialMfaEnabled(false);
        setNotice(result.message ?? "Configura tu aplicación autenticadora para continuar.");
      } else if (result.mfaToken) {
        setSetupEnrollment(null);
        setMfaToken(result.mfaToken);
        setFacialMfaEnabled(Boolean(result.facialMfaEnabled));
        setVerificationMode(result.facialMfaEnabled ? "face" : "totp");
        setNotice(result.message ?? "Credenciales verificadas. Completa el segundo factor.");
      } else {
        setNotice("La respuesta de autenticación no contiene un segundo factor válido.");
      }
    } catch {
      setNotice("No fue posible conectar con el backend. Verifica que el servidor esté activo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitPasswordResetRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${API_URL}/api/auth/password-reset/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.get("email") }),
      });
      const result: AuthResponse = await response.json();
      setNotice(result.message ?? result.error ?? "No fue posible solicitar el restablecimiento.");
    } catch {
      setNotice("No fue posible conectar con el backend. Verifica que el servidor esté activo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");
    const requirements = getPasswordRequirements(password);
    if (!requirements.length || !requirements.uppercase || !requirements.lowercase || !requirements.number) {
      setNotice("La contraseña debe tener entre 12 y 128 caracteres, con mayúsculas, minúsculas y números.");
      return;
    }
    if (password !== confirm) {
      setNotice("Las contraseñas no coinciden.");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/password-reset/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, password }),
      });
      const result: AuthResponse = await response.json();
      if (!response.ok || !result.success) {
        setNotice(result.error ?? "No fue posible actualizar la contraseña.");
        return;
      }
      window.history.replaceState({}, "", "/login");
      setResetToken("");
      setForgotPassword(false);
      setNotice(result.message ?? "Contraseña actualizada. Ya puedes iniciar sesión.");
    } catch {
      setNotice("No fue posible conectar con el backend. Verifica que el servidor esté activo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    if (name.length < 2 || name.length > 120) {
      setNotice("El nombre debe tener entre 2 y 120 caracteres.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setNotice("Escribe un correo electrónico válido.");
      return;
    }
    const requirements = getPasswordRequirements(password);
    if (!requirements.length || !requirements.uppercase || !requirements.lowercase || !requirements.number) {
      setNotice("Completa los requisitos indicados debajo del campo de contraseña.");
      return;
    }
    if (password !== formData.get("confirm")) {
      setNotice("Las contraseñas no coinciden.");
      return;
    }
    if (formData.get("biometricConsent") !== "on") {
      setNotice("Debes aceptar el uso de una plantilla facial cifrada para activar este factor.");
      return;
    }

    const faceDescriptor = capturedFaceDescriptor ?? await captureFace();
    if (!faceDescriptor) return;
    const profilePhoto = capturedProfilePhoto ?? (videoRef.current ? captureVideoFrame(videoRef.current) : null);

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: name,
          empresa: formData.get("company"),
          email,
          telefono_corporativo: formData.get("phone"),
          password,
          faceDescriptor,
          profilePhoto,
        }),
      });
      const result: AuthResponse = await response.json();
      if (!response.ok || !result.success || !result.enrollmentToken || !result.otpAuthUrl) {
        setNotice(result.error ?? "No fue posible iniciar el enrolamiento.");
        return;
      }

      setPendingRegistration({ token: result.enrollmentToken, otpAuthUrl: result.otpAuthUrl });
      setCapturedFaceDescriptor(null);
      stopCamera();
      setOtpCode("");
      form.reset();
      setNotice(result.message ?? "Escanea el código con tu aplicación autenticadora.");
    } catch {
      setNotice("No fue posible conectar con el backend para crear la cuenta.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function completeMfaSetup() {
    if (!setupEnrollment) return;
    setIsSubmitting(true);
    setNotice("");
    try {
      const response = await fetch(`${API_URL}/api/auth/setup-mfa`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${setupEnrollment.token}`,
        },
        body: JSON.stringify({
          otpCode,
          ...(capturedFaceDescriptor ? { faceDescriptor: capturedFaceDescriptor } : {}),
        }),
      });
      await finishAuthentication(response);
    } catch {
      setNotice("No fue posible conectar con el backend para configurar MFA.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyRegistrationTotp() {
    if (!pendingRegistration) return;
    setIsSubmitting(true);
    setNotice("");
    try {
      const response = await fetch(`${API_URL}/api/auth/register/verify-totp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pendingRegistration.token}`,
        },
        body: JSON.stringify({ otpCode }),
      });
      await finishAuthentication(response);
    } catch {
      setNotice("No fue posible confirmar el segundo factor del registro.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyLoginTotp() {
    if (!mfaToken) return;
    setIsSubmitting(true);
    setNotice("");
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-totp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mfaToken}`,
        },
        body: JSON.stringify({ otpCode }),
      });
      await finishAuthentication(response);
    } catch {
      setNotice("No fue posible verificar el código autenticador.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyLoginFace() {
    if (!mfaToken) {
      setNotice("Inicia sesión con correo y contraseña antes de verificar el rostro.");
      return;
    }
    const faceDescriptor = await captureFace();
    if (!faceDescriptor) return;

    setIsSubmitting(true);
    setNotice("");
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-facial`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mfaToken}`,
        },
        body: JSON.stringify({ faceDescriptor }),
      });
      await finishAuthentication(response);
    } catch {
      setNotice("No fue posible conectar con el backend para verificar el rostro.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function captureEnrollmentFace() {
    const descriptor = await captureFace();
    if (descriptor) {
      setCapturedProfilePhoto(videoRef.current ? captureVideoFrame(videoRef.current) : null);
      setCapturedFaceDescriptor(descriptor);
      stopCamera();
      setFaceState("captured");
      setNotice("Rostro enrolado en esta sesión. Confirma la configuración con tu código autenticador.");
    }
  }

  async function finishAuthentication(response: Response) {
    const result: AuthResponse = await response.json();
    if (!response.ok || !result.success || !result.token) {
      setNotice(result.error ?? "La verificación no fue aceptada.");
      return;
    }

    window.sessionStorage.setItem("sigil_access_token", result.token);
    stopCamera();
    router.replace("/dashboard");
  }

  function resetLogin() {
    stopCamera();
    setLoginStep(1);
    setCapturedFaceDescriptor(null);
    setMfaToken("");
    setSetupEnrollment(null);
    setOtpCode("");
    setRegistrationPassword("");
    setRegistrationPasswordConfirm("");
    setNotice("");
  }

  function changeTab(nextTab: Tab) {
    stopCamera();
    setTab(nextTab);
    setForgotPassword(false);
    setResetToken("");
    setLoginStep(1);
    setCapturedFaceDescriptor(null);
    setPendingRegistration(null);
    setSetupEnrollment(null);
    setMfaToken("");
    setOtpCode("");
    setRegistrationPassword("");
    setRegistrationPasswordConfirm("");
    setNotice("");
  }

  return (
    <section className={styles.panel}>
      <div className={styles.tabs}>
        <button className={tab === "login" ? styles.tabActive : ""} onClick={() => changeTab("login")}>Iniciar sesión</button>
        <button className={tab === "register" ? styles.tabActive : ""} onClick={() => changeTab("register")}>Crear cuenta</button>
      </div>

      {tab === "login" && loginStep === 1 && resetToken && (
        <form className={styles.form} onSubmit={submitPasswordReset}>
          <FormHeader step="RESTABLECER CONTRASEÑA" title="Crea una nueva contraseña" text="Elige una contraseña segura para volver a acceder a tu cuenta." />
          <Field label="Nueva contraseña" name="password" type="password" placeholder="Mínimo 12 caracteres" autoComplete="new-password" />
          <Field label="Validar contraseña" name="confirm" type="password" placeholder="Repite la nueva contraseña" autoComplete="new-password" />
          <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar nueva contraseña"}
          </button>
          <button type="button" className="forgotPassword" onClick={() => { window.history.replaceState({}, "", "/login"); setResetToken(""); setNotice(""); }}>
            Volver al inicio de sesión
          </button>
        </form>
      )}

      {tab === "login" && loginStep === 1 && forgotPassword && !resetToken && (
        <form className={styles.form} onSubmit={submitPasswordResetRequest}>
          <FormHeader step="RECUPERAR CONTRASEÑA" title="Restablece tu contraseña" text="Solicita un enlace seguro para crear una nueva contraseña." />
          <Field label="Correo corporativo" name="email" type="email" placeholder="admin@empresa.com" />
          <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Enviando..." : "Enviar enlace"}
          </button>
          <button type="button" className="forgotPassword" onClick={() => { setForgotPassword(false); setNotice(""); }}>
            Volver al inicio de sesión
          </button>
        </form>
      )}

      {tab === "login" && loginStep === 1 && !forgotPassword && !resetToken && (
        <form className={styles.form} onSubmit={submitLogin}>
          <FormHeader step="01 / CREDENCIALES" title="Acceso de administrador" text="Usa el correo corporativo registrado y tu contraseña." />
          <Field label="Correo corporativo" name="email" type="email" placeholder="admin@empresa.com" />
          <Field label="Contraseña" name="password" type="password" placeholder="Tu contraseña" />
          <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Validando..." : "Continuar con MFA"} <span>→</span>
          </button>
          <button type="button" className="forgotPassword" onClick={() => { setForgotPassword(true); setNotice(""); }}>¿Olvidaste tu contraseña?</button>
        </form>
      )}

      {tab === "login" && loginStep === 2 && setupEnrollment && (
        <MfaSetup
          title="Activa la autenticación multifactor"
          description="Escanea el QR con una aplicación autenticadora. Puedes activar reconocimiento facial ahora o usar TOTP como factor MFA."
          otpAuthUrl={setupEnrollment.otpAuthUrl}
          videoRef={videoRef}
          faceState={faceState}
          faceBox={detectedFaceBox}
          faceCaptured={Boolean(capturedFaceDescriptor)}
          otpCode={otpCode}
          setOtpCode={setOtpCode}
          onStartCamera={startCamera}
          onCaptureFace={captureEnrollmentFace}
          onConfirm={completeMfaSetup}
          isSubmitting={isSubmitting}
          onBack={resetLogin}
        />
      )}

      {tab === "login" && loginStep === 2 && !setupEnrollment && (
        <div className={styles.form}>
          <FormHeader step="02 / SEGUNDO FACTOR" title="Confirma tu identidad" text="Verifica el rostro o introduce el código temporal de tu aplicación autenticadora." />
          {facialMfaEnabled && verificationMode === "face" ? (
            <>
              <CameraFrame videoRef={videoRef} faceState={faceState} faceBox={detectedFaceBox} />
              <p className={styles.mfaStatus}><i /> {faceState === "camera" ? "Mantén el rostro centrado durante el análisis." : "El análisis combina descriptor, señal de vida y descriptor facial."}</p>
              <div className={styles.mfaActions}>
                <button type="button" className={styles.secondaryButton} onClick={resetLogin}>Volver</button>
                {faceState === "idle" ? (
                  <button type="button" className={styles.primaryButton} onClick={startCamera}>Activar cámara <span>→</span></button>
                ) : (
                  <button type="button" className={styles.primaryButton} onClick={verifyLoginFace} disabled={isSubmitting || faceState === "processing"}>
                    {faceState === "processing" ? "Analizando…" : "Verificar rostro"} <span>→</span>
                  </button>
                )}
              </div>
              <button type="button" className={`${styles.textButton} authenticatorButton`} onClick={() => { stopCamera(); setVerificationMode("totp"); setNotice(""); }}>
                Usar código autenticador en su lugar
              </button>
            </>
          ) : (
            <>
              {facialMfaEnabled && (
                <button type="button" className={`${styles.textButton} facialBackButton`} onClick={() => { setVerificationMode("face"); setOtpCode(""); setNotice(""); }}>
                  Volver a verificación facial
                </button>
              )}
              <label className={styles.field}>
                <span>Código de 6 dígitos</span>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  value={otpCode}
                  onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  required
                />
              </label>
              <div className={styles.mfaActions}>
                <button type="button" className={styles.secondaryButton} onClick={resetLogin}>Volver</button>
                <button type="button" className={styles.primaryButton} onClick={verifyLoginTotp} disabled={isSubmitting || otpCode.length !== 6}>
                  {isSubmitting ? "Verificando…" : "Verificar código"} <span>→</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "register" && pendingRegistration && (
        <MfaSetup
          title="Confirma tu aplicación autenticadora"
          description="Escanea el QR y confirma el código de seis dígitos. Tu plantilla facial ya está cifrada y no se guardó ninguna fotografía."
          otpAuthUrl={pendingRegistration.otpAuthUrl}
          videoRef={videoRef}
          faceState={faceState}
          faceBox={detectedFaceBox}
          faceCaptured
          otpCode={otpCode}
          setOtpCode={setOtpCode}
          onStartCamera={startCamera}
          onCaptureFace={captureEnrollmentFace}
          onConfirm={verifyRegistrationTotp}
          isSubmitting={isSubmitting}
          onBack={() => { setPendingRegistration(null); setOtpCode(""); setNotice(""); }}
        />
      )}

      {tab === "register" && !pendingRegistration && (
        <form className={styles.form} onSubmit={submitRegister}>
          <FormHeader step="ALTA DE ADMINISTRADOR" title="Crea tu cuenta corporativa" text="Registra tu rostro y activa una aplicación autenticadora antes de crear la cuenta." />
          <div className={styles.fieldGrid}>
            <Field label="Nombre completo" name="name" placeholder="Nombre y apellidos" />
            <Field label="Empresa" name="company" placeholder="Nombre de la empresa" />
            <Field label="Correo corporativo" name="email" type="email" placeholder="admin@empresa.com" />
            <Field label="Teléfono" name="phone" type="tel" placeholder="+52 000 000 0000" />
            <Field
              label="Contraseña"
              name="password"
              type="password"
              placeholder="Escribe una contraseña segura"
              autoComplete="new-password"
              maxLength={128}
              onValueChange={setRegistrationPassword}
            />
            <Field
              label="Confirmar contraseña"
              name="confirm"
              type="password"
              placeholder="Repite la contraseña"
              autoComplete="new-password"
              maxLength={128}
              onValueChange={setRegistrationPasswordConfirm}
            />
          </div>
          <ul className={styles.passwordRequirements} aria-label="Requisitos de la contraseña" aria-live="polite">
            <PasswordRequirement met={passwordRequirements.length}>Entre 12 y 128 caracteres</PasswordRequirement>
            <PasswordRequirement met={passwordRequirements.uppercase}>Al menos una letra mayúscula</PasswordRequirement>
            <PasswordRequirement met={passwordRequirements.lowercase}>Al menos una letra minúscula</PasswordRequirement>
            <PasswordRequirement met={passwordRequirements.number}>Al menos un número</PasswordRequirement>
            <PasswordRequirement met={passwordsMatch}>Las contraseñas coinciden</PasswordRequirement>
          </ul>
          <FaceEnroll
            onStart={startCamera}
            onCapture={captureEnrollmentFace}
            videoRef={videoRef}
            faceState={faceState}
            faceBox={detectedFaceBox}
            captured={Boolean(capturedFaceDescriptor)}
          />
          <label className={styles.consent}>
            <input type="checkbox" name="biometricConsent" required />
            <span>Consiento que se procese mi plantilla facial para autenticación MFA. No se almacenará la fotografía.</span>
          </label>
          <button className={styles.primaryButton} type="submit" disabled={isSubmitting || faceState === "processing"}>
            {isSubmitting ? "Registrando..." : "Registrar administrador"} <span>→</span>
          </button>
        </form>
      )}

      {notice && <p className={styles.notice} role="status">{notice}</p>}
      <p className={styles.panelFoot}>Los modelos se ejecutan localmente en el navegador. La plantilla cifrada se usa solo para comparación; el análisis de vida no sustituye un sistema certificado anti-suplantación.</p>
    </section>
  );
}

function FormHeader({ step, title, text }: { step: string; title: string; text: string }) {
  return <div className={styles.formHeader}><span>{step}</span><h2>{title}</h2><p>{text}</p></div>;
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  autoComplete,
  maxLength,
  onValueChange,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder: string;
  autoComplete?: string;
  maxLength?: number;
  onValueChange?: (value: string) => void;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={maxLength}
        onChange={onValueChange ? (event) => onValueChange(event.target.value) : undefined}
        required
      />
    </label>
  );
}

function PasswordRequirement({ met, children }: { met: boolean; children: string }) {
  return (
    <li
      className={met ? styles.passwordRequirementMet : styles.passwordRequirementPending}
      aria-label={`${children}: ${met ? "cumplido" : "pendiente"}`}
    >
      <span aria-hidden="true">{met ? "✓" : "○"}</span>
      {children}
    </li>
  );
}

function CameraFrame({
  videoRef,
  faceState,
  faceBox,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  faceState: FaceState;
  faceBox: DetectedFaceBox | null;
}) {
  const cameraVisible = faceState === "camera" || faceState === "processing";
  const cameraRef = useRef<HTMLDivElement>(null);
  const [cameraSize, setCameraSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;
    const updateSize = () => setCameraSize({ width: camera.clientWidth, height: camera.clientHeight });
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(camera);
    return () => observer.disconnect();
  }, []);

  const faceGuideStyle = faceBox && cameraSize.width > 0 && cameraSize.height > 0
    ? (() => {
        const scale = Math.max(cameraSize.width / faceBox.videoWidth, cameraSize.height / faceBox.videoHeight);
        const renderedWidth = faceBox.videoWidth * scale;
        const renderedHeight = faceBox.videoHeight * scale;
        const offsetX = (cameraSize.width - renderedWidth) / 2;
        const offsetY = (cameraSize.height - renderedHeight) / 2;
        const faceWidth = faceBox.width * scale;
        const faceHeight = faceBox.height * scale;
        const horizontalPadding = faceWidth * 0.04;
        const verticalPadding = faceHeight * 0.06;
        return {
        position: "absolute" as const,
        border: "2px solid #57dffe",
        borderRadius: "48% 48% 42% 42%",
        opacity: 1,
        transition: "left .08s linear, top .08s linear, width .08s linear, height .08s linear",
        left: `${offsetX + (faceBox.videoWidth - faceBox.x - faceBox.width) * scale - horizontalPadding}px`,
        top: `${offsetY + faceBox.y * scale - verticalPadding}px`,
        width: `${faceWidth + horizontalPadding * 2}px`,
        height: `${faceHeight + verticalPadding * 2}px`,
        };
      })()
    : undefined;
  return (
    <div ref={cameraRef} className={styles.camera}>
      <video ref={videoRef} autoPlay muted playsInline className={cameraVisible ? styles.videoVisible : ""} />
      {(cameraVisible || !faceBox) && (
        faceBox
          ? <div className="faceDetected" style={faceGuideStyle} aria-label="Rostro detectado" />
          : <div className={styles.faceGuide}><span /><span /><span /><span /></div>
      )}
      <div className={styles.cameraLabel}>
        {faceState === "camera" ? "Cámara activa · detección facial" : faceState === "processing" ? "Analizando rostro y señal de vida…" : faceState === "captured" ? "Rostro enrolado en esta sesión" : "Cámara no iniciada"}
      </div>
    </div>
  );
}

function FaceEnroll({
  onStart,
  onCapture,
  videoRef,
  faceState,
  faceBox,
  captured,
}: {
  onStart: () => void;
  onCapture: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  faceState: FaceState;
  faceBox: DetectedFaceBox | null;
  captured: boolean;
}) {
  return (
    <div className={styles.faceBox}>
      <div className={styles.faceHeader}><div><span>02 / ENROLAMIENTO FACIAL</span><h3>Reconocimiento facial</h3></div><b>LOCAL</b></div>
      <CameraFrame videoRef={videoRef} faceState={captured ? "captured" : faceState} faceBox={faceBox} />
      <div className={styles.faceActions}>
        {faceState === "idle" || faceState === "captured" ? (
          <button type="button" className={styles.outlineButton} onClick={onStart}>{captured ? "Reactivar cámara" : "Activar cámara"}</button>
        ) : (
          <button type="button" className={styles.outlineButton} onClick={onCapture} disabled={faceState === "processing"}>
            {faceState === "processing" ? "Analizando…" : captured ? "Capturar de nuevo" : "Capturar rostro"}
          </button>
        )}
        <small>Mantén el rostro centrado. Solo se envía el descriptor facial; no se suben imágenes.</small>
      </div>
    </div>
  );
}

function MfaSetup({
  title,
  description,
  otpAuthUrl,
  videoRef,
  faceState,
  faceBox,
  faceCaptured,
  otpCode,
  setOtpCode,
  onStartCamera,
  onCaptureFace,
  onConfirm,
  isSubmitting,
  onBack,
}: {
  title: string;
  description: string;
  otpAuthUrl: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  faceState: FaceState;
  faceBox: DetectedFaceBox | null;
  faceCaptured: boolean;
  otpCode: string;
  setOtpCode: (code: string) => void;
  onStartCamera: () => void;
  onCaptureFace: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  onBack: () => void;
}) {
  return (
    <div className={styles.form}>
      <FormHeader step="CONFIGURACIÓN MFA" title={title} text={description} />
      <div className={styles.qrContainer}>
        <QRCodeSVG value={otpAuthUrl} size={168} includeMargin aria-label="Código QR de la aplicación autenticadora" />
        <small>Guarda la cuenta en una aplicación TOTP antes de continuar. No compartas este QR.</small>
      </div>
      {!faceCaptured && (
        <div className={styles.faceBox}>
          <div className={styles.faceHeader}><div><span>OPCIONAL</span><h3>Enrolar reconocimiento facial</h3></div><b>PRIVADO</b></div>
          <CameraFrame videoRef={videoRef} faceState={faceState} faceBox={faceBox} />
          <div className={styles.faceActions}>
            {faceState === "idle" ? (
              <button type="button" className={styles.outlineButton} onClick={onStartCamera}>Activar cámara</button>
            ) : (
              <button type="button" className={styles.outlineButton} onClick={onCaptureFace} disabled={faceState === "processing"}>
                {faceState === "processing" ? "Analizando…" : "Capturar rostro"}
              </button>
            )}
            <small>Si omites el rostro, la cuenta usará TOTP como segundo factor.</small>
          </div>
        </div>
      )}
      {faceCaptured && <p className={styles.mfaStatus}><i /> Plantilla facial preparada y cifrada al confirmar.</p>}
      <label className={styles.field}>
        <span>Código de 6 dígitos</span>
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          pattern="[0-9]{6}"
          value={otpCode}
          onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          required
        />
      </label>
      <div className={styles.mfaActions}>
        <button type="button" className={styles.secondaryButton} onClick={onBack}>Volver</button>
        <button type="button" className={styles.primaryButton} onClick={onConfirm} disabled={isSubmitting || otpCode.length !== 6}>
          {isSubmitting ? "Confirmando…" : "Confirmar MFA"} <span>→</span>
        </button>
      </div>
    </div>
  );
}
