"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import styles from "../arco/page.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function RectificationReview() {
  const searchParams = useSearchParams();
  const requestId = searchParams.get("requestId") ?? "";
  const token = searchParams.get("token") ?? "";
  const requestedDecision = searchParams.get("decision");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const decision = requestedDecision === "approved" || requestedDecision === "rejected"
    ? requestedDecision
    : "";

  async function submit() {
    if (!requestId || !token || !decision) {
      setError("El enlace de revisión no contiene una solicitud válida.");
      return;
    }
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/api/privacy/rectification/review-by-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, token, decision }),
      });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) {
        setError(result.error ?? "No fue posible registrar la decisión.");
        return;
      }
      setMessage(result.message ?? "Decisión registrada correctamente.");
    } catch {
      setError("No fue posible conectar con el backend.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {decision ? (
        <>
          <p>
            {decision === "approved"
              ? "Autorizarás los cambios solicitados en los datos personales del usuario."
              : "Rechazarás la solicitud de rectificación enviada por el usuario."}
          </p>
          <button type="button" onClick={() => void submit()} disabled={submitting} className={styles.reviewButton}>
            {submitting ? "Procesando…" : decision === "approved" ? "Confirmar autorización" : "Confirmar rechazo"}
          </button>
        </>
      ) : (
        <p className={styles.error}>No se recibió una decisión válida en el enlace.</p>
      )}
      {message && <p className={styles.success} role="status">{message}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  );
}
