import { redirect } from "next/navigation";
import { checkLogin, homeFor, setSession } from "@/lib/auth";

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") || "");
  const password = String(form.get("password") || "");
  let result: Awaited<ReturnType<typeof checkLogin>>;
  try {
    result = await checkLogin(email, password);
  } catch {
    redirect("/login?error=Sign+in+failed.+Try+again.");
  }
  if ("error" in result && result.error) redirect(`/login?error=${encodeURIComponent(result.error)}`);
  if (!result.user) redirect("/login?error=Those+details+do+not+match.");
  await setSession(result.user.id);
  redirect(homeFor(result.user.role));
}
