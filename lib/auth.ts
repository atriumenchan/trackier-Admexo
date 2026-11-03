import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "crypto";
import { one, putSetting, setting } from "@/lib/db";
import { shortCode } from "@/lib/format";
import { verifyPassword } from "@/lib/password";
import type { Affiliate, Advertiser, Role, User } from "@/lib/types";

const COOKIE = "trk_session";

type Session = {
  uid: number;
  name: string;
  email: string;
  role: Role;
  affiliate_id: number | null;
  advertiser_id: number | null;
  exp: number;
};

async function secret() {
  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv) return fromEnv;
  const existing = (await setting("session_secret"));
  if (existing) return existing;
  const created = shortCode(40);
  (await putSetting("session_secret", created));
  return created;
}

async function sign(body: string) {
  return createHmac("sha256", (await secret())).update(body).digest("base64url");
}

export function homeFor(role: Role) {
  if (role === "affiliate") return "/portal";
  if (role === "advertiser") return "/brand";
  return "/dashboard";
}

function asUser(session: Session): User {
  return {
    id: session.uid,
    name: session.name,
    email: session.email,
    password_hash: "",
    role: session.role,
    affiliate_id: session.affiliate_id,
    advertiser_id: session.advertiser_id,
    api_token: null,
    created_at: "",
  };
}

export const readSession = cache(async (): Promise<Session | null> => {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;
  const expected = await sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString()) as Partial<Session> & { uid?: number; exp?: number };
    if (!parsed.uid || !parsed.exp || parsed.exp < Date.now()) return null;
    if (parsed.role && parsed.email && parsed.name) {
      return {
        uid: parsed.uid,
        name: parsed.name,
        email: parsed.email,
        role: parsed.role,
        affiliate_id: parsed.affiliate_id ?? null,
        advertiser_id: parsed.advertiser_id ?? null,
        exp: parsed.exp,
      };
    }
    const user = await one<User>("SELECT * FROM users WHERE id = ?", parsed.uid);
    if (!user) return null;
    return {
      uid: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      affiliate_id: user.affiliate_id,
      advertiser_id: user.advertiser_id,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
});

export async function currentUser() {
  const session = await readSession();
  return session ? asUser(session) : null;
}

export async function setSession(user: User | number) {
  const record = typeof user === "number" ? await one<User>("SELECT * FROM users WHERE id = ?", user) : user;
  if (!record) return;
  const payload: Session = {
    uid: record.id,
    name: record.name,
    email: record.email,
    role: record.role,
    affiliate_id: record.affiliate_id,
    advertiser_id: record.advertiser_id,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 14,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const jar = await cookies();
  jar.set(COOKIE, `${body}.${await sign(body)}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect(homeFor(user.role));
  return user;
}

export async function requireAffiliate() {
  const user = await requireUser();
  if (user.role !== "affiliate" || !user.affiliate_id) redirect(homeFor(user.role));
  const affiliate = await one<Affiliate>("SELECT * FROM affiliates WHERE id = ?", user.affiliate_id);
  if (!affiliate || affiliate.status === "blocked") redirect("/login?error=This+affiliate+login+is+blocked");
  return { user, affiliate };
}

export async function requireAdvertiser() {
  const user = await requireUser();
  if (user.role !== "advertiser" || !user.advertiser_id) redirect(homeFor(user.role));
  const advertiser = await one<Advertiser>("SELECT * FROM advertisers WHERE id = ?", user.advertiser_id);
  if (!advertiser || advertiser.status !== "active") redirect("/login?error=This+advertiser+login+is+paused");
  return { user, advertiser };
}

export async function checkLogin(email: string, password: string) {
  const user = await one<User>("SELECT * FROM users WHERE email = ?", email.trim().toLowerCase());
  if (!user || !verifyPassword(password, user.password_hash)) return { error: "Those details do not match." };
  if (user.role === "affiliate" && user.affiliate_id) {
    const affiliate = await one<Affiliate>("SELECT * FROM affiliates WHERE id = ?", user.affiliate_id);
    if (!affiliate || affiliate.status === "blocked") return { error: "This affiliate login is blocked." };
  }
  if (user.role === "advertiser" && user.advertiser_id) {
    const advertiser = await one<Advertiser>("SELECT * FROM advertisers WHERE id = ?", user.advertiser_id);
    if (!advertiser || advertiser.status !== "active") return { error: "This advertiser login is paused." };
  }
  return { user };
}
