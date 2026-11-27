import type { Metadata } from "next";
import DashboardClient from "./dashboard-client";

export const metadata: Metadata = {
  title: "Dashboard | Sigilia",
  description: "Panel de administración y control de la flota Sigilia.",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
