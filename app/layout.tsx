import type { Metadata } from "next";
import "./globals.css";
import "./theme-overrides.css";
import { LanguageSync } from "./preferences";

export const metadata: Metadata = {
  title: "Sigil.IA | Ciberseguridad & telemetría vehicular",
  description: "Ciberseguridad y telemetría vehicular inteligente para proteger y monitorear tu flota.",
  icons: {
    icon: "/icon.png?v=2",
    shortcut: "/icon.png?v=2",
    apple: "/icon.png?v=2",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col"><LanguageSync />{children}</body>
    </html>
  );
}
