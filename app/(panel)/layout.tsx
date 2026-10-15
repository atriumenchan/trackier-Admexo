import { requireAdmin } from "@/lib/auth";
import { Shell, type NavGroup } from "@/components/shell";

const groups: NavGroup[] = [
  { label: "Track", items: [{ href: "/dashboard", label: "Dashboard" }, { href: "/reports", label: "Reports" }] },
  { label: "Partners", items: [{ href: "/advertisers", label: "Advertisers" }, { href: "/affiliates", label: "Affiliates" }] },
  { label: "Campaigns", items: [{ href: "/offers", label: "Offers" }, { href: "/smart-links", label: "Smart links" }, { href: "/sync", label: "Offer sync" }] },
  { label: "Traffic", items: [{ href: "/clicks", label: "Clicks" }, { href: "/conversions", label: "Conversions" }, { href: "/postbacks", label: "Postbacks" }, { href: "/link-tester", label: "Link tester" }] },
  { label: "Finance", items: [{ href: "/payouts", label: "Payouts" }, { href: "/settings", label: "Settings" }] },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return <Shell user={{ name: user.name, email: user.email }} groups={groups}>{children}</Shell>;
}
