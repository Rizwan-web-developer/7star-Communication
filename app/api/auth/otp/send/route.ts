import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeEmail, normalizeIdentifier, validatePassword, verifyPassword } from "@/lib/auth/server";
import { issueOtp } from "@/lib/otp";
import { toIndustryType, toPlanTier } from "@/lib/mappers";
import { recommendedFeatures } from "@/lib/features";
import { slugify } from "@/lib/utils";
import { enforceTenantExpiry, isDemoExpired, isSubscriptionExpired } from "@/lib/subscription";

export const dynamic = "force-dynamic";

const ALLOWED_INDUSTRIES = new Set([
  "mobile", "electronics", "cosmetics-shop", "pharmacy", "paint-shop", "hardware-shop", "grocery",
]);

/** Best-effort public origin so the branded logo in the email resolves everywhere. */
function requestOrigin(req: Request): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const forwardedProto = req.headers.get("x-forwarded-proto") || "";
  if (host) {
    const proto = forwardedProto || (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return new URL(req.url).origin;
}

export async function POST(req: Request) {
  const origin = requestOrigin(req);
  try {
    const body = await req.json().catch(() => ({}));
    const purpose = String(body?.purpose ?? "").toUpperCase();
    const rawIdentifier = normalizeIdentifier(String(body?.identifier ?? body?.email ?? body?.username ?? ""));
    const email = normalizeEmail(String(body?.email ?? rawIdentifier));

    if (purpose === "LOGIN") {
      const identifier = normalizeIdentifier(String(body?.identifier ?? body?.email ?? body?.username ?? ""));
      const password = String(body?.password ?? "");
      if (!identifier || !password) return NextResponse.json({ message: "Email/username and password are required." }, { status: 400 });
      const identEmail = normalizeEmail(identifier);
      const user = await prisma.user.findFirst({
        where: { OR: [{ email: identEmail }, { username: identifier }, { username: identifier.toLowerCase() }] },
        select: {
          id: true, name: true, email: true, passwordHash: true, role: true, tenantId: true, isActive: true,
          tenant: { select: { id: true, status: true } },
        },
      });
      if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
        return NextResponse.json({ message: "Invalid credentials." }, { status: 401 });
      }
      // One-time panel: do not block login on trial/subscription expiry.
      if (user.tenant && (user.tenant as any).status === "DEACTIVE") {
        return NextResponse.json({ message: "This account is locked. Please contact support." }, { status: 403 });
      }
      await issueOtp(user.email, "LOGIN", undefined, origin);
      return NextResponse.json({ ok: true, step: "otp", purpose: "LOGIN", email: user.email, message: "Verification code sent to your email." });
    }

    if (purpose === "SIGNUP") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ message: "Enter a valid email address." }, { status: 400 });
      }
      const name = String(body?.name ?? "").trim();
      const ownerName = String(body?.ownerName ?? "").trim() || name;
      const phone = String(body?.phone ?? "").trim();
      const country = String(body?.country ?? "").trim();
      const location = String(body?.location ?? "").trim();
      const password = String(body?.password ?? "");
      const industry = String(body?.industry ?? "electronics");
      const packageKey = String(body?.package ?? "starter").trim().toLowerCase();

      if (name.length < 2) return NextResponse.json({ message: "Business name is required." }, { status: 400 });
      if (!phone) return NextResponse.json({ message: "Phone number is required." }, { status: 400 });
      if (!country) return NextResponse.json({ message: "Country/region is required." }, { status: 400 });
      if (!location) return NextResponse.json({ message: "City/address is required." }, { status: 400 });
      if (!ALLOWED_INDUSTRIES.has(industry)) {
        return NextResponse.json({ message: "Choose a valid business category." }, { status: 400 });
      }
      const passwordError = validatePassword(password);
      if (passwordError) return NextResponse.json({ message: passwordError }, { status: 400 });

      const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (existingUser) return NextResponse.json({ message: "This email already has an account. Please sign in." }, { status: 409 });

      const payload = { name, ownerName, phone, country, location, password, industry, package: packageKey };
      await issueOtp(email, "SIGNUP", payload, origin);
      return NextResponse.json({ ok: true, step: "otp", purpose: "SIGNUP", email, message: "Verification code sent to your email." });
    }

    return NextResponse.json({ message: "Invalid OTP purpose." }, { status: 400 });
  } catch (error) {
    console.error("OTP send error:", error);
    return NextResponse.json({ message: "Could not send the verification code. Please try again." }, { status: 500 });
  }
}
