import type { Metadata } from "next";
import SupportForm from "./support-form";

export const metadata: Metadata = {
  title: "Contactar soporte | Sigilia",
  description: "Envía una consulta al equipo de soporte de Sigilia.",
};

export default function SupportPage() {
  return <SupportForm />;
}
