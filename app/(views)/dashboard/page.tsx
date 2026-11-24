import type { Metadata } from "next";
import DashboardClient from "./dashboard-client";

export const metadata: Metadata = {
  title: "Dashboard | SIGILIA",
  description: "Panel de administración y control de la flota SIGILIA.",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
