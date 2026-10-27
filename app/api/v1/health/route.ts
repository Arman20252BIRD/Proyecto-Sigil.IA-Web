export function GET() {
  return Response.json(
    {
      status: "available",
      service: "sigil-web",
      apiVersion: "v1",
      backendConfigured: Boolean(process.env.SIGIL_BACKEND_URL?.trim()),
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
