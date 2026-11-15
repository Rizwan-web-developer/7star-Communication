import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantAccess } from "@/lib/auth/server";
import { assertTenantWritable } from "@/lib/trial-guard";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const access = await requireTenantAccess(params.id);
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const baseSelect = {
    id: true, uid: true, businessName: true, slug: true, industryType: true, status: true, accountType: true,
    email: true, phone: true, country: true, location: true, subscriptionPaidUntil: true, lastPaidAt: true,
    whatsappCountryCode: true, whatsappNumber: true,
  } as any;
  let business: any = null;
  try {
    business = await prisma.tenant.findUnique({ where: { id: params.id }, select: { ...baseSelect, logoDataUrl: true } });
  } catch {
    try {
      business = await prisma.tenant.findUnique({ where: { id: params.id }, select: baseSelect });
    } catch {
      const fallback = {
        id: true, uid: true, businessName: true, slug: true, industryType: true, status: true, accountType: true,
        email: true, phone: true, country: true, location: true, subscriptionPaidUntil: true, lastPaidAt: true,
      } as any;
      business = await prisma.tenant.findUnique({ where: { id: params.id }, select: fallback });
    }
  }
  if (!business) return NextResponse.json({ message: "Not found." }, { status: 404 });
  return NextResponse.json({ business, role: access.session.role });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const access = await requireTenantAccess(params.id);
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const blocked = await assertTenantWritable(params.id, { adminBypass: access.admin });
  if (blocked) return blocked;

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const data: Record<string, unknown> = {};

    // Shop can manage profile (NOT email)
    if (typeof body.businessName === "string" && body.businessName.trim().length >= 2) data.businessName = body.businessName.trim().slice(0, 120);
    if (typeof body.phone === "string") data.phone = body.phone.trim().slice(0, 40) || null;
    if (typeof body.country === "string") data.country = body.country.trim().slice(0, 80) || null;
    if (typeof body.location === "string") data.location = body.location.trim().slice(0, 200) || null;
    if (typeof body.whatsappCountryCode === "string") data.whatsappCountryCode = body.whatsappCountryCode.replace(/[^\d]/g, "").slice(0, 5) || null;
    if (typeof body.whatsappNumber === "string") data.whatsappNumber = body.whatsappNumber.replace(/[^\d+]/g, "").slice(0, 20) || null;
    if (body.logoDataUrl !== undefined) {
      const logo = typeof body.logoDataUrl === "string" ? body.logoDataUrl : "";
      // allow clearing, or cap size (~2MB data URL)
      if (logo && logo.length > 2_800_000) return NextResponse.json({ message: "Logo image is too large. Use a smaller image." }, { status: 400 });
      data.logoDataUrl = logo || null;
    }

    if (Object.keys(data).length === 0) return NextResponse.json({ message: "No valid changes provided." }, { status: 400 });

    let business: any = null;
    const outBase = { id: true, uid: true, businessName: true, email: true, phone: true, country: true, location: true, whatsappCountryCode: true, whatsappNumber: true } as any;
    const minimalBase = { id: true, uid: true, businessName: true, email: true, phone: true, country: true, location: true } as any;
    try {
      business = await prisma.tenant.update({ where: { id: params.id }, data: data as any, select: { ...outBase, logoDataUrl: true } });
    } catch {
      // fallback: persist without logoDataUrl and/or newer whatsapp fields if client/schema stale
      const { logoDataUrl, whatsappCountryCode, whatsappNumber, ...rest } = data as any;
      try {
        await prisma.tenant.update({ where: { id: params.id }, data: rest as any });
      } catch {
        // last resort: drop all optional extras
        const safe: any = {};
        if (typeof rest.businessName === "string") safe.businessName = rest.businessName;
        if (rest.phone !== undefined) safe.phone = rest.phone;
        if (rest.country !== undefined) safe.country = rest.country;
        if (rest.location !== undefined) safe.location = rest.location;
        if (Object.keys(safe).length) await prisma.tenant.update({ where: { id: params.id }, data: safe });
      }
      if (logoDataUrl !== undefined) {
        await prisma.$executeRaw`UPDATE "Tenant" SET "logoDataUrl" = ${logoDataUrl} WHERE "id" = ${params.id}`.catch(() => {});
      }
      if (whatsappCountryCode !== undefined) {
        await prisma.$executeRaw`UPDATE "Tenant" SET "whatsappCountryCode" = ${whatsappCountryCode} WHERE "id" = ${params.id}`.catch(() => {});
      }
      if (whatsappNumber !== undefined) {
        await prisma.$executeRaw`UPDATE "Tenant" SET "whatsappNumber" = ${whatsappNumber} WHERE "id" = ${params.id}`.catch(() => {});
      }
      try {
        business = await prisma.tenant.findUnique({ where: { id: params.id }, select: { ...outBase, logoDataUrl: true } });
      } catch {
        try {
          business = await prisma.tenant.findUnique({ where: { id: params.id }, select: outBase });
        } catch {
          business = await prisma.tenant.findUnique({ where: { id: params.id }, select: minimalBase });
        }
      }
    }
    return NextResponse.json({ business });
  } catch (error) {
    console.error("Shop profile update error:", error);
    const msg = error instanceof Error ? error.message : "Failed to update profile.";
    const safe = /max clients|timeout|ECONN|connection|FATAL|database/i.test(msg)
      ? "Database connection issue. Please try again in a moment."
      : "Failed to update profile.";
    return NextResponse.json({ message: safe }, { status: 500 });
  }
}
