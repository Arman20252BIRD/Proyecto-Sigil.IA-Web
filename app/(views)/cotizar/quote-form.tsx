"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import styles from "../components/public-pages.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const plans = ["Plan PyME", "Plan Empresarial", "Plan Corporativo"] as const;

export default function QuoteForm({ selectedPlan }: { selectedPlan?: string }) {
  const initialPlan = plans.includes(selectedPlan as (typeof plans)[number]) ? selectedPlan : "Plan Empresarial";
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setSent(false);
    setError("");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const response = await fetch(`${API_URL}/api/cotizacion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "No fue posible enviar la solicitud.");
      setSent(true);
      form.reset();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "No fue posible enviar la solicitud.");
    } finally {
      setSending(false);
    }
  }

  return <div className={styles.formCard}>
    <form onSubmit={submit}>
      <div className={styles.formGrid}>
        <label className={styles.field}><span>Plan de interés</span><select name="plan" defaultValue={initialPlan}><option value="Plan PyME">Plan PyME</option><option value="Plan Empresarial">Plan Empresarial</option><option value="Plan Corporativo">Plan Corporativo</option></select></label>
        <label className={styles.field}><span>Nombre completo y cargo</span><input name="contact" required placeholder="Ej. Ana García, gerente de operaciones" /></label>
        <label className={styles.field}><span>Correo de contacto</span><input name="email" type="email" required placeholder="nombre@correo.com" /></label>
        <label className={styles.field}><span>Teléfono</span><input name="phone" required placeholder="+52 ..." /></label>
        <label className={styles.field}><span>Nombre de la empresa</span><input name="company" required placeholder="Empresa o grupo" /></label>
        <label className={styles.field}><span>Vehículos aproximados</span><select name="fleet" defaultValue="1 a 5"><option>1 a 5</option><option>6 a 20</option><option>21 a 50</option><option>51 a 250</option><option>Más de 250</option></select></label>
        <label className={`${styles.field} ${styles.fieldFull}`}><span>Mensaje opcional</span><textarea name="message" placeholder="Cuéntanos brevemente qué necesitas monitorear." /></label>
      </div>
      <label className={styles.consent}><input name="privacyAccepted" type="checkbox" required /><span>Acepto que SIGILIA use estos datos para responder mi solicitud de cotización. Consulta el <Link href="/legal/privacidad" target="_blank">aviso de privacidad</Link>.</span></label>
      <button className={styles.primary} type="submit" disabled={sending}>{sending ? "Enviando solicitud..." : "Enviar solicitud de cotización"}</button>
      {sent && <p className={styles.success}>¡Solicitud enviada! Un asesor revisará tus datos y se pondrá en contacto contigo en menos de 24 horas.</p>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </form>
  </div>;
}
