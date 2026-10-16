import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// The click routes call enforceGoogleClick. This matcher is the path list those routes must stay inside.
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/t/:path*", "/s/:path*"],
};
