import type { Metadata } from "next";
import "./globals.css";
import "./theme-overrides.css";
import { LanguageSync } from "./preferences";

export const metadata: Metadata = {
  title: "Sigil.IA | Fleet Security Platform",
  description: "Seguridad inteligente para flotas.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col"><LanguageSync />{children}</body>
    </html>
  );
}
