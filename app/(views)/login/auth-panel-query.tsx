"use client";

import { useSearchParams } from "next/navigation";
import AuthPanel from "./auth-panel";

export default function AuthPanelQuery() {
  const searchParams = useSearchParams();
  const resetToken = searchParams.get("reset_token") ?? "";

  return <AuthPanel key={resetToken} initialResetToken={resetToken} />;
}
