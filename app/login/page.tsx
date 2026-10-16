import { redirect } from "next/navigation";
import { currentUser, homeFor } from "@/lib/auth";
import { Banner, btn, inputClass } from "@/components/ui";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await currentUser();
  if (user) redirect(homeFor(user.role));
  const { error } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form action="/api/login" method="post" className="surface-card w-full max-w-md p-6">
        <p className="font-display text-2xl text-ink">ADMEXO Track</p>
        <p className="mt-1 text-sm text-muted">Sign in to the tracking desk.</p>
        <div className="mt-5"><Banner error={error} /></div>
        <label className="mt-4 block">
          <span className="mb-1 block text-[12px] font-medium text-muted">Email</span>
          <input className={inputClass} name="email" type="email" required autoComplete="username" />
        </label>
        <label className="mt-3 block">
          <span className="mb-1 block text-[12px] font-medium text-muted">Password</span>
          <input className={inputClass} name="password" type="password" required autoComplete="current-password" />
        </label>
        <button className={`${btn} mt-5 w-full`}>Sign in</button>
        {process.env.NODE_ENV !== "production" ? (
          <p className="mt-4 text-[12px] leading-relaxed text-faint">
            Local admin admin@admexo.com / admin123. Affiliate demo@publisher.test / demo123. Advertiser demo@brand.test / demo123.
          </p>
        ) : null}
      </form>
    </main>
  );
}
