import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// One-time licensed shop panel: no trial/subscription expiry blocking.
export const TRIAL_UPGRADE_MESSAGE = "";

export function isTenantAccessExpired(_tenant: {
  accountType?: string | null;
  status?: string | null;
  trialEndsAt?: Date | string | null;
  subscriptionPaidUntil?: Date | string | null;
}, _now = new Date()): boolean {
  return false;
}

export function upgradeRequiredResponse(message = TRIAL_UPGRADE_MESSAGE) {
  return NextResponse.json({ message: message || "Access denied." }, { status: 403 });
}

export async function assertTenantWritable(
  tenantId: string,
  _opts?: { adminBypass?: boolean },
): Promise<NextResponse | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true },
  });
  if (!tenant) return NextResponse.json({ message: "Business not found." }, { status: 404 });
  return null;
}
