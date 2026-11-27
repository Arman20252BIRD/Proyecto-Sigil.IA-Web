"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { captureLiveFaceDescriptor, trackLiveFaceBox, type DetectedFaceBox } from "../../../servidor/models/frontend/face-recognition";
import styles from "./page.module.css";

type Tab = "login" | "register";
type FaceState = "idle" | "camera" | "processing" | "captured";
type Enrollment = { token: string; otpAuthUrl: string; continueToOnboarding?: boolean };
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const PRIVACY_NOTICE_COOKIE = "sigil_privacy_notice";
const PRIVACY_NOTICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 180;
const ONBOARDING_TOKEN_STORAGE_KEY = "sigil_onboarding_token";

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
  onboardingRequired?: boolean;
  onboardingToken?: string;
  onboardingAfterMfa?: boolean;
  facialMfaEnabled?: boolean;
  resetToken?: string;
  admin?: { id?: string | number; email?: string; nombre?: string; empresa?: string };
};

export default function AuthPanel({ initialResetToken = "", initialInvitationToken = "" }: { initialResetToken?: string; initialInvitationToken?: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("login");
  const [loginStep, setLoginStep] = useState<1 | 2>(1);
  const [faceState, setFaceState] = useState<FaceState>("idle");
  const [notice, setNotice] = useState("");
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetToken, setResetToken] = useState(initialResetToken);
  const initialInvite = initialInvitationToken;
  const [invitationInput, setInvitationInput] = useState(initialInvitationToken);
  const [validatedInvitationToken, setValidatedInvitationToken] = useState("");
  const [invitationDetails, setInvitationDetails] = useState<{ email: string; empresa: string } | null>(null);
  const invitationForRegistration = initialInvite || validatedInvitationToken;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mfaToken, setMfaToken] = useState("");
  const [onboardingToken, setOnboardingToken] = useState("");
  const [onboardingEmail, setOnboardingEmail] = useState("");
  const [setupEnrollment, setSetupEnrollment] = useState<Enrollment | null>(null);
  const [pendingRegistration, setPendingRegistration] = useState<Enrollment | null>(null);
  const [facialMfaEnabled, setFacialMfaEnabled] = useState(false);
  const [verificationMode, setVerificationMode] = useState<"face" | "totp">("face");
  const [otpCode, setOtpCode] = useState("");
  const [capturedFaceDescriptor, setCapturedFaceDescriptor] = useState<number[] | null>(null);
  const [capturedProfilePhoto, setCapturedProfilePhoto] = useState<string | null>(null);
  const [registrationPassword, setRegistrationPassword] = useState("");
  const [registrationPasswordConfirm, setRegistrationPasswordConfirm] = useState("");
  const [privacyNoticeAccepted, setPrivacyNoticeAccepted] = useState(false);
  const [privacyConsentStatus, setPrivacyConsentStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [detectedFaceBox, setDetectedFaceBox] = useState<DetectedFaceBox | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceTrackingAbortRef = useRef<AbortController | null>(null);
  const cameraStartingRef = useRef(false);
  const passwordRequirements = getPasswordRequirements(registrationPassword);
  const passwordsMatch = registrationPassword.length > 0
    && registrationPassword === registrationPasswordConfirm;
  const isLoginView = tab === "login" || (tab === "register" && !pendingRegistration && !onboardingToken);

  useEffect(() => {
    const savedOnboardingToken = window.sessionStorage.getItem(ONBOARDING_TOKEN_STORAGE_KEY);
    if (!savedOnboardingToken) return;

    const timer = window.setTimeout(() => {
      setOnboardingToken(savedOnboardingToken);
      setPrivacyNoticeAccepted(false);
      setPrivacyConsentStatus("idle");
      setTab("register");
      setLoginStep(1);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
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

  function captureProfilePhoto(): string | null {
    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) {
      return null;
    }

    const maxWidth = 480;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) return null;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  }

  async function handlePrivacyNoticeChange(accepted: boolean) {
    setPrivacyNoticeAccepted(accepted);
    if (!accepted) {
      setPrivacyConsentStatus("idle");
      document.cookie = `${PRIVACY_NOTICE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
      return;
    }

    setPrivacyConsentStatus("saving");
    try {
      const response = await fetch(`${API_URL}/api/privacy/notice/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: true, version: "1.0" }),
      });
      if (!response.ok) throw new Error("privacy-consent-not-recorded");
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${PRIVACY_NOTICE_COOKIE}=accepted; Path=/; Max-Age=${PRIVACY_NOTICE_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
      setPrivacyConsentStatus("saved");
    } catch {
      setPrivacyNoticeAccepted(false);
      setPrivacyConsentStatus("error");
    }
  }

  async function startCamera() {
    if (cameraStartingRef.current) return;
    cameraStartingRef.current = true;
    setNotice("");
    setCapturedFaceDescriptor(null);
    setCapturedProfilePhoto(null);
    setDetectedFaceBox(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraStartingRef.current = false;
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
      const video = videoRef.current;
      video.srcObject = stream;
      if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
        await new Promise<void>((resolve, reject) => {
          const timeout = window.setTimeout(() => {
            cleanup();
            reject(new Error("La cámara no respondió a tiempo. Intenta activarla de nuevo."));
          }, 10_000);
          const cleanup = () => {
            window.clearTimeout(timeout);
            video.removeEventListener("loadedmetadata", handleLoaded);
            video.removeEventListener("error", handleError);
          };
          const handleLoaded = () => {
            cleanup();
            resolve();
          };
          const handleError = () => {
            cleanup();
            reject(new Error("No fue posible iniciar el reproductor de cámara."));
          };
          video.addEventListener("loadedmetadata", handleLoaded, { once: true });
          video.addEventListener("error", handleError, { once: true });
        });
      }
      try {
        await video.play();
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError"
          && streamRef.current === stream && video.readyState >= HTMLMediaElement.HAVE_METADATA)) {
          throw error;
        }
      }
      const trackingController = new AbortController();
      faceTrackingAbortRef.current = trackingController;
      void trackLiveFaceBox(video, setDetectedFaceBox, trackingController.signal).catch(() => {
        if (!trackingController.signal.aborted) setDetectedFaceBox(null);
      });
      setFaceState("camera");
      setNotice("Cámara activa. Mira al frente y mantén el rostro centrado durante el análisis.");
    } catch (error) {
      stopCamera();
      setNotice(error instanceof Error ? error.message : "No se pudo acceder a la cámara.");
    } finally {
      cameraStartingRef.current = false;
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
      if (result.onboardingRequired && result.onboardingToken) {
        setOnboardingToken(result.onboardingToken);
        setPrivacyNoticeAccepted(false);
        setPrivacyConsentStatus("idle");
        window.sessionStorage.setItem(ONBOARDING_TOKEN_STORAGE_KEY, result.onboardingToken);
        setOnboardingEmail(String(result.admin?.email ?? formData.get("email") ?? ""));
        setTab("register");
        setLoginStep(1);
        setSetupEnrollment(null);
        setMfaToken("");
        setNotice(result.message ?? "Completa la activación inicial de tu cuenta.");
      } else if (result.enrollmentRequired && result.setupToken && result.otpAuthUrl) {
        setSetupEnrollment({
          token: result.setupToken,
          otpAuthUrl: result.otpAuthUrl,
          continueToOnboarding: Boolean(result.onboardingAfterMfa),
        });
        setMfaToken("");
        setFacialMfaEnabled(false);
        setNotice(result.message ?? "Configura tu aplicación autenticadora para continuar.");
      } else if (result.mfaToken) {
        setSetupEnrollment(null);
        setMfaToken(result.mfaToken);
        setFacialMfaEnabled(Boolean(result.facialMfaEnabled));
        setVerificationMode(result.facialMfaEnabled ? "face" : "totp");
        setNotice("");
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
      const response = await fetch(`${API_URL}/api/auth/password-reset/verify-totp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.get("email"), otpCode: formData.get("otpCode") }),
      });
      const result: AuthResponse = await response.json();
      if (!response.ok || !result.success || !result.resetToken) {
        setNotice(result.error ?? "No fue posible verificar el código autenticador.");
        return;
      }
      setResetToken(result.resetToken);
      setLoginStep(1);
      setForgotPassword(true);
      setNotice("");
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
      setLoginStep(1);
      setMfaToken("");
      window.location.replace("/login");
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
    const activeOnboardingToken = onboardingToken
      || window.sessionStorage.getItem(ONBOARDING_TOKEN_STORAGE_KEY)
      || "";
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const email = (onboardingEmail || String(formData.get("email") ?? "")).trim();
    const invitationToken = String(formData.get("invitationToken") ?? "").trim();
    if (name.length < 2 || name.length > 120) {
      setNotice("El nombre debe tener entre 2 y 120 caracteres.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setNotice("Escribe un correo electrónico válido.");
      return;
    }
    if (!activeOnboardingToken && !invitationToken) {
      setNotice("Pega el código de invitación enviado por soporte de Sigilia.");
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
    if (formData.get("privacyNoticeAccepted") !== "on") {
      setNotice("Debes leer y aceptar el Aviso de privacidad para crear la cuenta.");
      return;
    }
    if (privacyConsentStatus !== "saved") {
      setNotice("Espera a que se confirme el registro del Aviso de privacidad.");
      return;
    }

    const faceDescriptor = capturedFaceDescriptor ?? await captureFace();
    if (!faceDescriptor) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}${activeOnboardingToken ? "/api/auth/onboarding/complete" : "/api/auth/register"}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(activeOnboardingToken ? { Authorization: `Bearer ${activeOnboardingToken}` } : {}),
        },
        body: JSON.stringify({
          nombre: name,
          empresa: formData.get("company"),
          email: onboardingEmail || email,
          ...(activeOnboardingToken ? {} : { invitationToken }),
          telefono_corporativo: formData.get("phone"),
          password,
          faceDescriptor,
          profilePhoto: capturedProfilePhoto,
          privacyNoticeAccepted: true,
          termsAccepted: true,
          biometricConsent: true,
          marketingConsent: formData.get("marketingConsent") === "on",
        }),
      });
      const result: AuthResponse = await response.json();
      if (activeOnboardingToken) {
        setOnboardingToken("");
        if (!response.ok || !result.success || !result.token) {
          setNotice(result.error ?? "No fue posible completar el registro.");
          return;
        }
        setCapturedFaceDescriptor(null);
        setCapturedProfilePhoto(null);
        stopCamera();
        setOtpCode("");
        form.reset();
        window.sessionStorage.removeItem(ONBOARDING_TOKEN_STORAGE_KEY);
        finishAuthenticationResult(result);
      } else {
        if (!response.ok || !result.success || !result.enrollmentToken || !result.otpAuthUrl) {
          setNotice(result.error ?? "No fue posible iniciar el enrolamiento.");
          return;
        }
        setPendingRegistration({ token: result.enrollmentToken, otpAuthUrl: result.otpAuthUrl });
        setCapturedFaceDescriptor(null);
        setCapturedProfilePhoto(null);
        stopCamera();
        setOtpCode("");
        form.reset();
      }
      setNotice(result.message ?? "Escanea el código con tu aplicación autenticadora.");
    } catch {
      setNotice("No fue posible conectar con el backend para crear la cuenta.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function validateInvitation() {
    const token = invitationInput.trim();
    if (!token) {
      setNotice("Pega el código de invitación enviado por soporte de Sigilia.");
      return;
    }
    setIsSubmitting(true);
    setNotice("");
    try {
      const response = await fetch(`${API_URL}/api/auth/invitation/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationToken: token }),
      });
      const result = await response.json();
      if (!response.ok || !result.valid) {
        setValidatedInvitationToken("");
        setInvitationDetails(null);
        setNotice(result.error ?? "La invitación no pudo validarse.");
        return;
      }
      setValidatedInvitationToken(token);
      setInvitationDetails({ email: result.email, empresa: result.empresa });
      setNotice("Invitación válida. Ya puedes activar la cuenta autorizada.");
    } catch {
      setNotice("No fue posible conectar con el backend para validar la invitación.");
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
      const result: AuthResponse = await response.json();
      if (!response.ok || !result.success) {
        setNotice(result.error ?? "La verificaciÃ³n OTP no fue aceptada.");
        return;
      }
      if (result.onboardingRequired && result.onboardingToken) {
        setOnboardingToken(result.onboardingToken);
        setPrivacyNoticeAccepted(false);
        setPrivacyConsentStatus("idle");
        window.sessionStorage.setItem(ONBOARDING_TOKEN_STORAGE_KEY, result.onboardingToken);
        setOnboardingEmail(String(result.admin?.email ?? ""));
        setSetupEnrollment(null);
        setCapturedFaceDescriptor(null);
        setOtpCode("");
        setTab("register");
        setLoginStep(1);
        setNotice(result.message ?? "OTP verificado. Completa tu registro y valida tu identidad con reconocimiento facial.");
        return;
      }
      finishAuthenticationResult(result);
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
    // Capturamos la imagen mientras la cámara sigue activa. El descriptor se
    // usa para validar la identidad; la imagen independiente se usa solo como
    // foto visible del perfil en el dashboard.
    const liveProfilePhoto = captureProfilePhoto();
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
        body: JSON.stringify({ faceDescriptor, profilePhoto: liveProfilePhoto ?? captureProfilePhoto() }),
      });
      await finishAuthentication(response);
    } catch {
      setNotice("No fue posible conectar con el backend para verificar el rostro.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function captureEnrollmentFace() {
    const liveProfilePhoto = captureProfilePhoto();
    const descriptor = await captureFace();
    if (descriptor) {
      setCapturedFaceDescriptor(descriptor);
      setCapturedProfilePhoto(liveProfilePhoto ?? captureProfilePhoto());
      stopCamera();
      setFaceState("captured");
      setNotice("Rostro enrolado en esta sesión. Confirma la configuración con tu código autenticador.");
    }
  }

  function finishAuthenticationResult(result: AuthResponse) {
    if (!result.success || !result.token) {
      setNotice(result.error ?? "La verificaciÃ³n no fue aceptada.");
      return;
    }

    window.sessionStorage.setItem("sigil_access_token", result.token);
    stopCamera();
    window.location.replace("/dashboard");
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
    setTab("login");
    setLoginStep(1);
    setCapturedFaceDescriptor(null);
    setCapturedProfilePhoto(null);
    setMfaToken("");
    setSetupEnrollment(null);
    setOtpCode("");
    setRegistrationPassword("");
    setRegistrationPasswordConfirm("");
    setOnboardingToken("");
    window.sessionStorage.removeItem(ONBOARDING_TOKEN_STORAGE_KEY);
    setOnboardingEmail("");
    setNotice("");
  }

  function changeTab(nextTab: Tab) {
    stopCamera();
    setTab(nextTab);
    setForgotPassword(false);
    setResetToken("");
    setLoginStep(1);
    setCapturedFaceDescriptor(null);
    setCapturedProfilePhoto(null);
    setPendingRegistration(null);
    setSetupEnrollment(null);
    setMfaToken("");
    setOtpCode("");
    setRegistrationPassword("");
    setRegistrationPasswordConfirm("");
    setOnboardingToken("");
    window.sessionStorage.removeItem(ONBOARDING_TOKEN_STORAGE_KEY);
    setOnboardingEmail("");
    setNotice("");
  }

  return (
    <section className={styles.panel}>
      <div className={styles.loginBanner}>
        <Image
          src="/login/banner.jpg"
          alt="Espacio de trabajo para acceder al portal administrativo Sigilia"
          fill
          priority
          sizes="(max-width: 850px) 100vw, 58vw"
        />
      </div>
      {isLoginView && loginStep === 1 && resetToken && (
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

      {isLoginView && loginStep === 1 && forgotPassword && !resetToken && (
        <form className={styles.form} onSubmit={submitPasswordResetRequest}>
          <FormHeader step="RECUPERAR CONTRASEÑA" title="Verifica tu aplicación autenticadora" text="Ingresa el correo de tu cuenta y el código vigente de seis dígitos de tu aplicación." />
          <Field label="Correo corporativo" name="email" type="email" placeholder="admin@empresa.com" autoComplete="username" />
          <Field label="Código autenticador" name="otpCode" placeholder="000000" autoComplete="one-time-code" maxLength={6} inputMode="numeric" pattern="[0-9]{6}" />
          <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Verificando..." : "Verificar código"}
          </button>
          <button type="button" className="forgotPassword" onClick={() => { setForgotPassword(false); setResetToken(""); setNotice(""); }}>
            Volver al inicio de sesión
          </button>
        </form>
      )}

      {isLoginView && loginStep === 1 && !forgotPassword && !resetToken && (
        <form className={styles.form} onSubmit={submitLogin}>
          <FormHeader step="" title="Bienvenido" text="Ingresa tu correo y contraseña." />
          <Field label="Correo corporativo" name="email" type="email" placeholder="admin@empresa.com" />
          <Field label="Contraseña" name="password" type="password" placeholder="Tu contraseña" />
          <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Validando..." : "Iniciar sesión"} <span>→</span>
          </button>
          <button type="button" className="forgotPassword" onClick={() => { setForgotPassword(true); setNotice(""); }}>¿Olvidaste tu contraseña?</button>
        </form>
      )}

      {isLoginView && loginStep === 2 && setupEnrollment && (
        <MfaSetup
          title="Configura tu código OTP"
          description="Escanea el código QR con Microsoft Authenticator. Después usa el código de 6 dígitos para iniciar sesión."
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
          allowFaceEnrollment={!setupEnrollment.continueToOnboarding}
        />
      )}

      {isLoginView && loginStep === 2 && !setupEnrollment && (
        <div className={styles.form}>
          <FormHeader
            title="Verifica con MFA"
            text={facialMfaEnabled
              ? "Elige reconocimiento facial o código OTP de Microsoft Authenticator."
              : "Introduce el código OTP de seis dígitos de Microsoft Authenticator."}
          />
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
                <span>Código de Microsoft Authenticator</span>
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
          description="Escanea el QR y confirma el código de seis dígitos. La plantilla facial se guarda cifrada y la captura se conserva únicamente como foto de perfil."
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
          allowFaceEnrollment={false}
        />
      )}

      {tab === "register" && !pendingRegistration && onboardingToken && (
        <form className={styles.form} onSubmit={submitRegister}>
          <FormHeader step="PRIMER ACCESO" title="Completa tu registro corporativo" text="Establece tu contraseña, registra tus datos y configura MFA para entrar al dashboard." />
          <div className={styles.fieldGrid}>
            <Field label="Nombre completo" name="name" placeholder="Nombre y apellidos" />
            <Field label="Empresa" name="company" placeholder="Nombre de la empresa" />
            <Field label="Correo corporativo" name="email" type="email" placeholder="admin@empresa.com" defaultValue={onboardingEmail} disabled={Boolean(onboardingToken)} />
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
            <input type="checkbox" name="privacyNoticeAccepted" required checked={privacyNoticeAccepted} onChange={(event) => void handlePrivacyNoticeChange(event.target.checked)} />
            <span>He leído y acepto el <a href="/legal/privacidad" target="_blank" rel="noreferrer">Aviso de Privacidad</a> y los <a href="/legal/terminos" target="_blank" rel="noreferrer">Términos y Condiciones</a>.</span>
          </label>
          {privacyConsentStatus === "saving" && <p className={styles.privacyConsentStatus} role="status">Registrando la aceptación...</p>}
          {privacyConsentStatus === "error" && <p className={styles.privacyConsentError} role="alert">No fue posible registrar la aceptación. Inténtalo nuevamente.</p>}
          <label className={styles.consent}>
            <input type="checkbox" name="marketingConsent" />
            <span>Acepto recibir comunicados opcionales sobre mejoras y encuestas de Sigilia.</span>
          </label>
          <button className={styles.primaryButton} type="submit" disabled={isSubmitting || faceState === "processing"}>
            {isSubmitting ? "Activando..." : "Activar cuenta autorizada"} <span>→</span>
          </button>
        </form>
      )}

      {notice && <p className={styles.notice} role="status">{notice}</p>}
    </section>
  );
}

function FormHeader({ step, title, text }: { step?: string; title: string; text: string }) {
  return <div className={styles.formHeader}>{step && <span>{step}</span>}<h2>{title}</h2><p>{text}</p></div>;
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  autoComplete,
  defaultValue,
  disabled,
  maxLength,
  inputMode,
  pattern,
  onValueChange,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder: string;
  autoComplete?: string;
  defaultValue?: string;
  disabled?: boolean;
  maxLength?: number;
  inputMode?: "numeric" | "text";
  pattern?: string;
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
        defaultValue={defaultValue}
        disabled={disabled}
        maxLength={maxLength}
        inputMode={inputMode}
        pattern={pattern}
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
      <video ref={videoRef} muted playsInline className={cameraVisible ? styles.videoVisible : ""} />
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
      <div className={styles.faceHeader}><div><span>02 / ENROLAMIENTO FACIAL</span><h3>Reconocimiento facial</h3></div></div>
      <CameraFrame videoRef={videoRef} faceState={captured ? "captured" : faceState} faceBox={faceBox} />
      <div className={styles.faceActions}>
        {faceState === "idle" || faceState === "captured" ? (
          <button type="button" className={styles.outlineButton} onClick={onStart}>{captured ? "Reactivar cámara" : "Activar cámara"}</button>
        ) : (
          <button type="button" className={styles.outlineButton} onClick={onCapture} disabled={faceState === "processing"}>
            {faceState === "processing" ? "Analizando…" : captured ? "Capturar de nuevo" : "Capturar rostro"}
          </button>
        )}
        <small>Mantén el rostro centrado. Se guarda una foto de perfil separada del descriptor facial cifrado.</small>
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
  allowFaceEnrollment,
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
  allowFaceEnrollment: boolean;
}) {
  return (
    <div className={styles.form}>
      <FormHeader step="CONFIGURACIÓN MFA" title={title} text={description} />
      <div className={styles.qrContainer}>
        <QRCodeSVG value={otpAuthUrl} size={168} includeMargin aria-label="Código QR de la aplicación autenticadora" />
        <small>Guarda la cuenta en una aplicación TOTP antes de continuar. No compartas este QR.</small>
      </div>
      {allowFaceEnrollment && !faceCaptured && (
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
      {allowFaceEnrollment && faceCaptured && <p className={styles.mfaStatus}><i /> Plantilla facial preparada y cifrada al confirmar.</p>}
      <label className={styles.field}>
        <span>Código de Microsoft Authenticator (6 dígitos)</span>
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
