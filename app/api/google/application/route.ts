import { currentUser } from "@/lib/auth";
import { googlePack } from "@/lib/google-actions";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== "admin") return Response.json({ error: "Admin session required." }, { status: 401 });
  const text = await googlePack();
  return new Response(text, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
