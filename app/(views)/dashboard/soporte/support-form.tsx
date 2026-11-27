"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { fetchWithAuth } from "../../../../servidor/controllers/frontend/dashboard.controller";
import styles from "./support-form.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function SupportForm() {
  const router = useRouter();
  const [session, setSession] = useState<"checking" | "ready" | "error">("checking");
  const [attempt, setAttempt] = useState(0);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    let active = true;
    if (!window.sessionStorage.getItem("sigil_access_token")) {
      router.replace("/login");
      return;
    }
    void fetchWithAuth(`${API_URL}/api/admin`, { cache: "no-store" }).then((response) => {
      if (!active) return;
      if (response.status === 401 || response.status === 403) {
        router.replace("/login");
        return;
      }
      setSession(response.ok ? "ready" : "error");
    }).catch(() => { if (active) setSession("error"); });
    return () => { active = false; };
  }, [router, attempt]);

  const submitSupport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setFeedback(null);
    try {
      const response = await fetchWithAuth(`${API_URL}/api/support`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
      });
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      const result: unknown = await response.json();
      if (!response.ok) {
        const error = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
          ? result.error : "No fue posible enviar el mensaje.";
        throw new Error(error);
      }
      setSubject("");
      setMessage("");
      setFeedback({ ok: true, message: "Tu mensaje fue enviado a soporte." });
    } catch (error) {
      setFeedback({ ok: false, message: error instanceof Error ? error.message : "No fue posible enviar el mensaje." });
    } finally {
      setSending(false);
    }
  };

  return <main className={styles.page}>
    <header className={styles.header}>
      <Link href="/dashboard" aria-label="Volver al panel de Sigilia"><Image src="/logo-sigilia-original.png" alt="Sigilia" width={2560} height={960} priority /></Link>
      <Link className={styles.back} href="/dashboard">← Volver al panel</Link>
    </header>
    <section className={styles.card}>
      <h1>Contactar a soporte</h1>
      <p>Envíanos tu consulta a <a href="mailto:soporte@sigilia.com.mx">soporte@sigilia.com.mx</a>. El equipo podrá responder al correo de tu cuenta.</p>
      {session === "checking" && <p role="status">Verificando tu sesión…</p>}
      {session === "error" && <div role="alert"><p>No fue posible verificar tu sesión. Revisa la conexión e intenta nuevamente.</p><button type="button" onClick={() => { setSession("checking"); setAttempt((value) => value + 1); }}>Reintentar</button></div>}
      {session === "ready" && <form className={styles.form} onSubmit={submitSupport}>
        <label htmlFor="support-subject">Asunto</label>
        <input id="support-subject" value={subject} onChange={(event) => setSubject(event.target.value)} minLength={3} maxLength={120} required disabled={sending} placeholder="¿En qué podemos ayudarte?" />
        <label htmlFor="support-message">Mensaje</label>
        <textarea id="support-message" value={message} onChange={(event) => setMessage(event.target.value)} minLength={10} maxLength={5000} required disabled={sending} rows={7} placeholder="Describe tu consulta o problema." />
        <button type="submit" disabled={sending}>{sending ? "Enviando…" : "Enviar mensaje"}</button>
        {feedback && <p className={feedback.ok ? styles.success : styles.error} role={feedback.ok ? "status" : "alert"}>{feedback.message}</p>}
      </form>}
    </section>
  </main>;
}
