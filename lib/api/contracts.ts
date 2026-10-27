export interface LoginRequest {
  email: string;
  password: string;
  rememberDevice: boolean;
}

export interface LoginChallenge {
  status: "mfa_required";
  challengeId: string;
}

export interface FaceVerificationRequest {
  challengeId: string;
  verificationToken: string;
}

export interface AuthenticatedSession {
  status: "authenticated";
  user: {
    id: string;
    fullName: string;
    role: string;
  };
}

export interface RegistrationRequest {
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  password: string;
}

export interface RegistrationPending {
  status: "enrollment_required";
  enrollmentId: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export function isLoginChallenge(value: unknown): value is LoginChallenge {
  return (
    isRecord(value) &&
    value.status === "mfa_required" &&
    typeof value.challengeId === "string" &&
    value.challengeId.length > 0
  );
}

export function isRegistrationPending(
  value: unknown,
): value is RegistrationPending {
  return (
    isRecord(value) &&
    value.status === "enrollment_required" &&
    typeof value.enrollmentId === "string" &&
    value.enrollmentId.length > 0
  );
}

export function isAuthenticatedSession(
  value: unknown,
): value is AuthenticatedSession {
  return (
    isRecord(value) &&
    value.status === "authenticated" &&
    isRecord(value.user) &&
    typeof value.user.id === "string" &&
    value.user.id.length > 0 &&
    typeof value.user.fullName === "string" &&
    typeof value.user.role === "string" &&
    value.user.role.length > 0
  );
}

export function isApiErrorResponse(
  value: unknown,
): value is ApiErrorResponse {
  return (
    isRecord(value) &&
    isRecord(value.error) &&
    typeof value.error.code === "string" &&
    typeof value.error.message === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
