import { requireAdvertiser } from "@/lib/auth";
import { Shell } from "@/components/shell";

export default async function BrandLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdvertiser();
  return <Shell user={{ name: user.name, email: user.email }} groups={[{ label: "Advertiser", items: [{ href: "/brand", label: "Overview" }] }]}>{children}</Shell>;
}
