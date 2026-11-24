"use client";

import { useSearchParams } from "next/navigation";
import AuthPanel from "./auth-panel";

export default function AuthPanelQuery() {
  const searchParams = useSearchParams();
  const resetToken = searchParams.get("reset_token") ?? "";
  const invitationToken = searchParams.get("invite") ?? "";

  return <AuthPanel key={`${resetToken}:${invitationToken}`} initialResetToken={resetToken} initialInvitationToken={invitationToken} />;
}
