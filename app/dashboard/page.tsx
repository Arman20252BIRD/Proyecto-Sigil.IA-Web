import type { Metadata } from "next";
import DashboardClient from "./dashboard-client";

export const metadata: Metadata = {
  title: "Dashboard | Sigil.IA",
  description: "Panel de administración y control de la flota Sigil.IA.",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
