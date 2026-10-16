import { openApiDocument } from "@/lib/openapi";

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  return Response.json(openApiDocument(origin));
}
