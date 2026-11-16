import { NextResponse } from "next/server";

import { requireTenantAccess } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { getTenantFeatureKeys } from "@/lib/tenant-features";

export const dynamic = "force-dynamic";

/**
 * One call that returns everything the shop panel shell needs.
 *
 * The panel used to call `/api/auth/me`, `/profile` and `/features` separately.
 * Each call re-checked the session in the database, and because the database
 * pool allows a single connection per instance those checks queued behind each
 * other. Returning all three together removes two round trips on every load.
 */
const PROFILE_SELECT = {
  id: true,
  uid: true,
  businessName: true,
  slug: true,
  industryType: true,
  status: true,
  accountType: true,
  email: true,
  phone: true,
  country: true,
  location: true,
  subscriptionPaidUntil: true,
  lastPaidAt: true,
  whatsappCountryCode: true,
  whatsappNumber: true,
} as const;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const access = await requireTenantAccess(params.id);
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [business, features] = await Promise.all([
    prisma.tenant
      .findUnique({ where: { id: params.id }, select: { ...PROFILE_SELECT, logoDataUrl: true, updatedAt: true } })
      // Older databases may not have the logo / WhatsApp columns yet.
      .catch(() => prisma.tenant.findUnique({ where: { id: params.id }, select: { ...PROFILE_SELECT, updatedAt: true } })),
    getTenantFeatureKeys(params.id),
  ]);

  if (!business) return NextResponse.json({ message: "Not found." }, { status: 404 });

  // The logo itself is served from `/logo` (cacheable image) instead of being
  // embedded in this JSON on every page load.
  const { logoDataUrl, updatedAt, ...profile } = business as typeof business & {
    logoDataUrl?: string | null;
    updatedAt?: Date;
  };

  const { session } = access;
  return NextResponse.json(
    {
      user: {
        id: session.sub,
        name: session.name,
        username: (session as any).username ?? null,
        email: session.email,
        role: session.role,
        tenantId: session.tenantId,
      },
      business: {
        ...profile,
        hasLogo: Boolean(logoDataUrl),
        logoVersion: updatedAt ? new Date(updatedAt).getTime() : null,
      },
      features,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
