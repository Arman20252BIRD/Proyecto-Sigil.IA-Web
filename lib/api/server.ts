export function validateSameOriginJsonRequest(
  request: Request,
): Response | null {
  const origin = request.headers.get("origin");

  if (!origin || origin !== new URL(request.url).origin) {
    return apiErrorResponse(
      "INVALID_ORIGIN",
      "La solicitud debe provenir del mismo origen.",
      403,
    );
  }

  const fetchSite = request.headers.get("sec-fetch-site");

  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return apiErrorResponse(
      "CROSS_SITE_REQUEST_REJECTED",
      "No se aceptan solicitudes de otros sitios.",
      403,
    );
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
    return apiErrorResponse(
      "UNSUPPORTED_MEDIA_TYPE",
      "El cuerpo de la solicitud debe usar application/json.",
      415,
    );
  }

  return null;
}

export function notImplementedResponse(operation: string) {
  return apiErrorResponse(
    "AUTH_BACKEND_NOT_CONFIGURED",
    `El backend de autenticación todavía no está conectado; no se procesó la solicitud de ${operation}.`,
    501,
  );
}

function apiErrorResponse(code: string, message: string, status: number) {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
