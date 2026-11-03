import { requireAdmin } from "@/lib/auth";
import { Shell, type NavGroup } from "@/components/shell";

const groups: NavGroup[] = [
  { label: "Overview", items: [{ href: "/dashboard", label: "Dashboard", icon: "dashboard" }] },
  {
    label: "Tracking",
    items: [
      { href: "/clicks", label: "Clicks", icon: "click" },
      { href: "/conversions", label: "Conversions", icon: "target" },
      { href: "/postbacks", label: "Postbacks", icon: "postback" },
      { href: "/smart-links", label: "Smart links", icon: "shuffle" },
      { href: "/link-tester", label: "Link tester", icon: "flask" },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/offers", label: "Offers", icon: "offer" },
      { href: "/advertisers", label: "Advertisers", icon: "building" },
      { href: "/affiliates", label: "Affiliates", icon: "users" },
      { href: "/sync", label: "Offer sync", icon: "sync" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { href: "/reports", label: "Reports", icon: "chart" },
      { href: "/payouts", label: "Payouts", icon: "wallet" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/fraud", label: "Fraud monitoring", icon: "shield" },
      { href: "/google", label: "Google compliance", icon: "badge" },
      { href: "/settings", label: "Settings", icon: "settings" },
      { href: "/help", label: "Help", icon: "help" },
    ],
  },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <Shell user={{ name: user.name, email: user.email }} groups={groups} role="Admin" action={{ href: "/offers/new", label: "New offer" }}>
      {children}
    </Shell>
  );
}
