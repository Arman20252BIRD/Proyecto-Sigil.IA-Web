import {
  notImplementedResponse,
  validateSameOriginJsonRequest,
} from "@/lib/api/server";

export function POST(request: Request) {
  const invalidRequest = validateSameOriginJsonRequest(request);

  if (invalidRequest) {
    return invalidRequest;
  }

  return notImplementedResponse("registro de cuenta");
}
