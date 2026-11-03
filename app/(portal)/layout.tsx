import { requireAffiliate } from "@/lib/auth";
import { Shell } from "@/components/shell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAffiliate();
  const account = { name: user.name, email: user.email };
  return (
    <Shell
      user={account}
      role="Affiliate"
      groups={[
        { label: "Overview", items: [{ href: "/portal", label: "Overview", icon: "dashboard" }] },
        {
          label: "Your account",
          items: [
            { href: "/portal/offers", label: "Offers", icon: "offer" },
            { href: "/portal/conversions", label: "Conversions", icon: "target" },
            { href: "/portal/postback", label: "Postback", icon: "postback" },
          ],
        },
      ]}
    >
      {children}
    </Shell>
  );
}
