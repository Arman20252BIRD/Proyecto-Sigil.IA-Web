"use client";

import { useSearchParams } from "next/navigation";
import styles from "./page.module.css";

export default function GmailStatus() {
  const status = useSearchParams().get("gmail");
  if (!status) return null;
  if (status === "sent") return <p className={styles.success}>La solicitud se envió desde la cuenta de Gmail autorizada hacia sigil.ia.soporte@gmail.com.</p>;
  if (status.includes("cuenta_no_coincide")) return <p className={styles.error}>La cuenta de Google autorizada no coincide con el correo capturado en el formulario.</p>;
  return <p className={styles.error}>No fue posible enviar la solicitud mediante Gmail. Intenta nuevamente.</p>;
}
