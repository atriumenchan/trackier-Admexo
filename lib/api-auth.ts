import { one } from "@/lib/db";
import type { User } from "@/lib/types";

export async function apiUser(req: Request) {
  const header = req.headers.get("authorization") || "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  return (await one<User>("SELECT * FROM users WHERE api_token = ?", token));
}

export function unauthorized() {
  return Response.json({ error: "Send Authorization: Bearer and an API token." }, { status: 401 });
}
