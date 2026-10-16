import { apiUser, unauthorized } from "@/lib/api-auth";
import { advertiserOffers, affiliateOffers, listOffers } from "@/lib/queries";

export async function GET(req: Request) {
  const user = await apiUser(req);
  if (!user) return unauthorized();
  if (user.role === "affiliate" && user.affiliate_id) return Response.json(await affiliateOffers(user.affiliate_id));
  if (user.role === "advertiser" && user.advertiser_id) return Response.json(await advertiserOffers(user.advertiser_id));
  return Response.json(await listOffers());
}
