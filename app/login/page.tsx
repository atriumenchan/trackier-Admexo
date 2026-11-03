import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, homeFor } from "@/lib/auth";
import { Banner, Field, btn, inputClass } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Logo } from "@/components/logo";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await currentUser();
  if (user) redirect(homeFor(user.role));
  const { error } = await searchParams;
  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <section className="relative hidden overflow-hidden bg-night p-12 text-night-text lg:flex lg:flex-col">
        <div className="grid-backdrop pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top_left,black_25%,transparent_70%)]" />
        <div className="pointer-events-none absolute -left-40 -top-40 h-[420px] w-[620px] rounded-full bg-brand/25 blur-[110px]" />
        <Link href="/" className="relative flex items-center gap-2.5">
          <Logo size={30} />
          <span className="text-[17px] font-semibold tracking-tight">Adcliqx</span>
        </Link>
        <div className="relative my-auto max-w-md">
          <h1 className="text-[2.2rem] font-semibold leading-tight tracking-tight text-white">Every click. Every conversion. Every payout.</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-night-muted">The tracking desk for clicks, postbacks, attribution, fraud checks and affiliate payouts.</p>
          <ul className="mt-8 space-y-3 text-[14px]">
            {["Real-time click and conversion logs", "Reports you can open down to a single click", "Fraud rules on every click and conversion"].map((item) => (
              <li key={item} className="flex items-center gap-2.5">
                <span className="grid size-5 place-items-center rounded-full bg-brand/25 text-brand-soft"><Icon name="check" size={12} strokeWidth={2.4} /></span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-[12.5px] text-night-muted">© {new Date().getFullYear()} Adcliqx. A product of Admexo LLC.</p>
      </section>

      <section className="flex flex-col px-5 py-8 sm:px-10">
        <Link href="/" className="flex items-center gap-2.5 lg:hidden">
          <Logo />
          <span className="text-[16px] font-semibold tracking-tight">Adcliqx</span>
        </Link>
        <div className="mx-auto my-auto w-full max-w-[400px] py-10">
          <h2 className="text-[1.6rem] font-semibold tracking-tight text-ink">Sign in to Adcliqx</h2>
          <p className="mt-1.5 text-[14px] text-muted">For our team, advertisers and affiliates.</p>
          <form action="/api/login" method="post" className="mt-7 space-y-4">
            <Banner error={error} />
            <Field label="Email">
              <input className={inputClass} name="email" type="email" required autoComplete="username" placeholder="you@company.com" />
            </Field>
            <Field label="Password">
              <input className={inputClass} name="password" type="password" required autoComplete="current-password" />
            </Field>
            <button className={`${btn} w-full py-2.5`}>Sign in <Icon name="arrowRight" size={16} /></button>
          </form>
          <p className="mt-6 text-[13px] text-muted">No account? Ask your account manager. There is no public sign-up.</p>
          {process.env.NODE_ENV !== "production" ? (
            <p className="mt-4 rounded-sm border border-dashed border-border-strong px-3 py-2 text-[12px] leading-relaxed text-faint">
              Local admin admin@admexo.com / admin123. Affiliate demo@publisher.test / demo123. Advertiser demo@brand.test / demo123.
            </p>
          ) : null}
        </div>
        <p className="flex flex-wrap justify-center gap-5 text-[12.5px] text-muted">
          <Link href="/" className="hover:text-ink">Home</Link>
          <Link href="/terms" className="hover:text-ink">Terms</Link>
          <Link href="/privacy" className="hover:text-ink">Privacy policy</Link>
          <Link href="/click-tracker" className="hover:text-ink">Documentation</Link>
        </p>
      </section>
    </main>
  );
}
