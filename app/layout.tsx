import type { Metadata } from "next";
import Analytics from "./analytics";
import "./(views)/globals.css";
import "./(views)/theme-overrides.css";

export const metadata: Metadata = {
  title: "Sigilia | Ciberseguridad & telemetría vehicular",
  description: "Ciberseguridad y telemetría vehicular inteligente para proteger y monitorear tu flota.",
  icons: {
    icon: "/logo-sigilia-original.png",
    shortcut: "/logo-sigilia-original.png",
    apple: "/logo-sigilia-original.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
