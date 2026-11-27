"use client";

import { useRef, useState, type ChangeEvent, type FormEvent, type MouseEvent } from "react";
import styles from "./page.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("No fue posible leer el archivo."));
    reader.readAsDataURL(file);
  });
}

export default function ArcoForm() {
  const editorRef = useRef<HTMLDivElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function format(command: string, event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    editorRef.current?.focus();
    document.execCommand(command);
  }

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (selected.some((file) => file.size > MAX_FILE_SIZE)) {
      setError("Cada archivo debe pesar como máximo 5 MB.");
      return;
    }
    if (files.length + selected.length > 5) {
      setError("Puedes adjuntar hasta cinco archivos.");
      return;
    }
    setError("");
    setFiles((current) => [...current, ...selected]);
    event.target.value = "";
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);
    const derechos = formData.getAll("derechos").filter((value): value is string => typeof value === "string");
    const solicitudHtml = editorRef.current?.innerHTML ?? "";
    const solicitudText = editorRef.current?.innerText.trim() ?? "";
    if (derechos.length === 0) {
      setError("Selecciona al menos un derecho: acceso, rectificación o cancelación.");
      return;
    }
    if (!solicitudText) {
      setError("Describe tu solicitud antes de continuar.");
      return;
    }
    setIsSubmitting(true);
    try {
      const attachments = await Promise.all(files.map(async (file) => ({
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        dataBase64: await fileToBase64(file),
      })));
      const response = await fetch(`${API_URL}/api/privacy/arco/gmail/authorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: formData.get("nombre"),
          contacto: formData.get("contacto"),
          derechos,
          solicitudHtml,
          solicitudText,
          attachments,
        }),
      });
      const result = await response.json() as { authorizationUrl?: string; error?: string };
      if (!response.ok || !result.authorizationUrl) {
        setError(result.error ?? "No fue posible iniciar la autorización de Gmail.");
        return;
      }
      window.location.assign(result.authorizationUrl);
    } catch {
      setError("No fue posible conectar con el backend.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return <form className={styles.form} onSubmit={submit}>
    <label>Nombre completo<input name="nombre" required /></label>
    <label>Correo o medio para recibir notificaciones<input name="contacto" type="email" required /></label>
    <fieldset className={styles.rightsFieldset}>
      <legend>Derechos que deseas ejercer</legend>
      <p className={styles.rightsHint}>Puedes seleccionar uno, dos o los tres derechos.</p>
      <label className={styles.rightOption}><input name="derechos" type="checkbox" value="acceso" /> <span><strong>Acceso</strong><small>Solicitar qué datos personales conserva Sigilia y cómo se utilizan.</small></span></label>
      <label className={styles.rightOption}><input name="derechos" type="checkbox" value="rectificacion" /> <span><strong>Rectificación</strong><small>Solicitar la corrección de datos inexactos o desactualizados.</small></span></label>
      <label className={styles.rightOption}><input name="derechos" type="checkbox" value="cancelacion" /> <span><strong>Cancelación</strong><small>Solicitar la eliminación de los datos cuando corresponda.</small></span></label>
    </fieldset>
    <label>Descripción breve de la solicitud</label>
    <div className={styles.editor}>
      <div className={styles.editorToolbar} aria-label="Formato del texto">
        <button type="button" onMouseDown={(event) => format("bold", event)} aria-label="Negrita"><strong>B</strong></button>
        <button type="button" onMouseDown={(event) => format("italic", event)} aria-label="Cursiva"><em>I</em></button>
        <button type="button" onMouseDown={(event) => format("underline", event)} aria-label="Subrayado"><u>U</u></button>
        <button type="button" onMouseDown={(event) => format("insertUnorderedList", event)} aria-label="Lista">• Lista</button>
        <button type="button" onMouseDown={(event) => format("insertOrderedList", event)} aria-label="Lista numerada">1. Lista</button>
      </div>
      <div ref={editorRef} className={styles.editorBody} contentEditable role="textbox" aria-multiline="true" data-placeholder="Buenas tardes, por medio de la presente solicito…" />
    </div>
    <label className={styles.filePicker}>Adjuntar documentos<input type="file" multiple accept=".pdf,.png,.jpg,.jpeg" onChange={selectFiles} /><span>Seleccionar archivos</span></label>
    {files.length > 0 && <ul className={styles.fileList}>{files.map((file, index) => <li key={`${file.name}-${index}`}><span>{file.name}</span><button type="button" onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}>Quitar</button></li>)}</ul>}
    <p className={styles.note}>Puedes adjuntar hasta cinco documentos, con un máximo de 5 MB por archivo y 10 MB en total.</p>
    {error && <p className={styles.error}>{error}</p>}
    <button type="submit" disabled={isSubmitting}>{isSubmitting ? "Enviando solicitud…" : "Enviar solicitud"}</button>
  </form>;
}
