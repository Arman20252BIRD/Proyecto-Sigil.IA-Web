"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./page.module.css";

type Tab = "login" | "register";

export default function AuthPanel() {
  const [tab, setTab] = useState<Tab>("login");
  const [loginStep, setLoginStep] = useState<1 | 2>(1);
  const [faceState, setFaceState] = useState<"idle" | "camera" | "captured">("idle");
  const [notice, setNotice] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  async function startCamera() {
    setNotice("");
    if (!navigator.mediaDevices?.getUserMedia) { setNotice("Tu navegador no permite acceder a la cámara. La captura se conectará al servicio biométrico en producción."); return; }
    try { const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false }); streamRef.current = stream; if (videoRef.current) videoRef.current.srcObject = stream; setFaceState("camera"); } catch { setNotice("No se concedió acceso a la cámara. Puedes continuar cuando el servicio de enrolamiento esté configurado."); }
  }
  function captureFace() { setFaceState("captured"); setNotice("Captura preparada. La extracción, comparación y persistencia del vector facial se ejecutarán en el backend seguro."); }
  function submitLogin(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setLoginStep(2); setNotice("Credenciales recibidas. Completa el segundo factor facial para continuar."); }
  function submitRegister(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); if (faceState !== "captured") { setNotice("Captura primero el rostro para completar el enrolamiento del administrador."); return; } setNotice("Registro preparado. Falta conectar la API de usuarios, consentimiento biométrico y almacenamiento cifrado."); }
  function resetLogin() { setLoginStep(1); setNotice(""); }

  return <section className={styles.panel}>
    <div className={styles.tabs}><button className={tab === "login" ? styles.tabActive : ""} onClick={() => { setTab("login"); setNotice(""); }}>Iniciar sesión</button><button className={tab === "register" ? styles.tabActive : ""} onClick={() => { setTab("register"); setNotice(""); }}>Crear cuenta</button></div>
    {tab === "login" ? (loginStep === 1 ? <form className={styles.form} onSubmit={submitLogin}><FormHeader step="01 / CREDENCIALES" title="Acceso de administrador" text="Usa el correo corporativo registrado y tu contraseña maestra." /><Field label="Correo corporativo" name="email" type="email" placeholder="admin@empresa.com" /><Field label="Contraseña" name="password" type="password" placeholder="Tu contraseña" /><label className={styles.check}><input type="checkbox" /> Recordar esta terminal <a href="#ayuda">¿Olvidaste tu contraseña?</a></label><button className={styles.primaryButton} type="submit">Continuar con MFA <span>→</span></button></form> : <FaceStep onBack={resetLogin} onStart={startCamera} onVerify={captureFace} videoRef={videoRef} faceState={faceState} />) : <form className={styles.form} onSubmit={submitRegister}><FormHeader step="ALTA DE ADMINISTRADOR" title="Crea tu cuenta corporativa" text="Completa tus datos y registra tu rostro para habilitar el MFA." /><div className={styles.fieldGrid}><Field label="Nombre completo" name="name" placeholder="Nombre y apellidos" /><Field label="Empresa" name="company" placeholder="Nombre de la empresa" /><Field label="Correo corporativo" name="email" type="email" placeholder="admin@empresa.com" /><Field label="Teléfono" name="phone" type="tel" placeholder="+52 000 000 0000" /><Field label="Contraseña" name="password" type="password" placeholder="Mínimo 8 caracteres" /><Field label="Confirmar contraseña" name="confirm" type="password" placeholder="Repite la contraseña" /></div><FaceEnroll onStart={startCamera} onCapture={captureFace} videoRef={videoRef} faceState={faceState} /><button className={styles.primaryButton} type="submit">Registrar administrador <span>→</span></button></form>}
    {notice && <p className={styles.notice}>{notice}</p>}<p className={styles.panelFoot}>Al continuar aceptas el uso seguro de tus datos para autenticación y recuperación de cuenta.</p>
  </section>;
}

function FormHeader({ step, title, text }: { step: string; title: string; text: string }) { return <div className={styles.formHeader}><span>{step}</span><h2>{title}</h2><p>{text}</p></div>; }
function Field({ label, name, type = "text", placeholder }: { label: string; name: string; type?: string; placeholder: string }) { return <label className={styles.field}><span>{label}</span><input name={name} type={type} placeholder={placeholder} required /></label>; }
function CameraFrame({ videoRef, faceState }: { videoRef: React.RefObject<HTMLVideoElement | null>; faceState: string }) { return <div className={styles.camera}><video ref={videoRef} autoPlay muted playsInline className={faceState === "camera" ? styles.videoVisible : ""} /><div className={styles.faceGuide}><span /><span /><span /><span /></div><div className={styles.cameraLabel}>{faceState === "camera" ? "Cámara lista · centra tu rostro" : faceState === "captured" ? "Captura preparada" : "Cámara no iniciada"}</div></div>; }
function FaceEnroll({ onStart, onCapture, videoRef, faceState }: { onStart: () => void; onCapture: () => void; videoRef: React.RefObject<HTMLVideoElement | null>; faceState: string }) { return <div className={styles.faceBox}><div className={styles.faceHeader}><div><span>02 / ENROLAMIENTO</span><h3>Registra tu rostro</h3></div><b>OBLIGATORIO</b></div><CameraFrame videoRef={videoRef} faceState={faceState} /><div className={styles.faceActions}>{faceState === "idle" ? <button type="button" className={styles.outlineButton} onClick={onStart}>Activar cámara</button> : <button type="button" className={styles.outlineButton} onClick={onCapture}>{faceState === "captured" ? "Rostro capturado" : "Capturar rostro"}</button>}<small>La imagen se procesará como vector biométrico cifrado.</small></div></div>; }
function FaceStep({ onBack, onStart, onVerify, videoRef, faceState }: { onBack: () => void; onStart: () => void; onVerify: () => void; videoRef: React.RefObject<HTMLVideoElement | null>; faceState: string }) { return <div className={styles.form}><FormHeader step="02 / RETO MFA" title="Confirma tu identidad" text="La cámara comprobará el rostro enrolado para habilitar el dashboard." /><CameraFrame videoRef={videoRef} faceState={faceState} /><div className={styles.mfaStatus}><i /> Comparación facial segura pendiente</div><div className={styles.mfaActions}><button type="button" className={styles.secondaryButton} onClick={onBack}>Volver</button>{faceState === "idle" ? <button type="button" className={styles.primaryButton} onClick={onStart}>Activar cámara <span>→</span></button> : <button type="button" className={styles.primaryButton} onClick={onVerify}>Verificar rostro <span>→</span></button>}</div></div>; }
