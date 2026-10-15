import { requireAffiliate } from "@/lib/auth";
import { Shell } from "@/components/shell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAffiliate();
  const account = { name: user.name, email: user.email };
  return (
    <Shell
      user={account}
      groups={[{
        label: "Your account",
        items: [
          { href: "/portal", label: "Overview" },
          { href: "/portal/offers", label: "Offers" },
          { href: "/portal/conversions", label: "Conversions" },
          { href: "/portal/postback", label: "Postback" },
        ],
      }]}
    >
      {children}
    </Shell>
  );
}
