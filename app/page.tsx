import type { Metadata } from "next";
import InformativoPage from "./informativo/page";

export const metadata: Metadata = {
  title: "Sigil.IA | Seguridad inteligente para flotas",
  description:
    "Conoce la plataforma de seguridad para flotas basada en edge computing, inferencia inteligente y AWS.",
};

export default function Home() {
  return <InformativoPage />;
}
