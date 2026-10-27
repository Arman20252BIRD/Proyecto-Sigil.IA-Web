import {
  isApiErrorResponse,
  isAuthenticatedSession,
  isLoginChallenge,
  isRegistrationPending,
  type AuthenticatedSession,
  type FaceVerificationRequest,
  type LoginChallenge,
  type LoginRequest,
  type RegistrationPending,
  type RegistrationRequest,
} from "./contracts";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function login(input: LoginRequest): Promise<LoginChallenge> {
  return postJson("/auth/login", input, isLoginChallenge);
}

export function register(
  input: RegistrationRequest,
): Promise<RegistrationPending> {
  return postJson("/auth/register", input, isRegistrationPending);
}

export function verifyFace(
  input: FaceVerificationRequest,
): Promise<AuthenticatedSession> {
  return postJson("/auth/face", input, isAuthenticatedSession);
}

export function getSession(): Promise<AuthenticatedSession> {
  return requestJson(
    "/auth/session",
    { method: "GET" },
    isAuthenticatedSession,
  );
}

export async function logout(): Promise<void> {
  const response = await request("/auth/logout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });

  if (!response.ok) {
    await throwApiError(response);
  }

  if (response.status !== 204) {
    throw new ApiError(
      "La API devolvió un estado inesperado al cerrar la sesión.",
      "INVALID_API_RESPONSE",
      response.status,
    );
  }
}

function postJson<T>(
  path: string,
  body: object,
  isExpectedResponse: (value: unknown) => value is T,
): Promise<T> {
  return requestJson(
    path,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    isExpectedResponse,
  );
}

async function request(
  path: string,
  init: RequestInit,
): Promise<Response> {
  try {
    return await fetch(`/api/v1${path}`, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      "No se pudo conectar con la API. Comprueba que el servidor esté activo.",
      "API_UNAVAILABLE",
      0,
    );
  }
}

async function requestJson<T>(
  path: string,
  init: RequestInit,
  isExpectedResponse: (value: unknown) => value is T,
): Promise<T> {
  const response = await request(path, init);
  let payload: unknown;

  try {
    payload = await response.json();
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      throw error;
    }

    if (!response.ok) {
      return throwInvalidErrorResponse(response);
    }

    throw new ApiError(
      "La API devolvió una respuesta que no es JSON válida.",
      "INVALID_API_RESPONSE",
      response.status,
    );
  }

  if (!response.ok) {
    return throwApiErrorPayload(response, payload);
  }

  if (!isExpectedResponse(payload)) {
    throw new ApiError(
      "La API respondió con un formato diferente al contrato esperado.",
      "INVALID_API_RESPONSE",
      response.status,
    );
  }

  return payload;
}

async function throwApiError(response: Response): Promise<never> {
  let payload: unknown;

  try {
    payload = await response.json();
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      throw error;
    }

    return throwInvalidErrorResponse(response);
  }

  return throwApiErrorPayload(response, payload);
}

function throwApiErrorPayload(
  response: Response,
  payload: unknown,
): never {
  if (isApiErrorResponse(payload)) {
    throw new ApiError(
      payload.error.message,
      payload.error.code,
      response.status,
    );
  }

  throw new ApiError(
    `La solicitud a la API falló con el estado ${response.status}.`,
    "API_REQUEST_FAILED",
    response.status,
  );
}

function throwInvalidErrorResponse(response: Response): never {
  throw new ApiError(
    `La API respondió con el estado ${response.status} y un error no válido.`,
    "INVALID_API_ERROR",
    response.status,
  );
}
