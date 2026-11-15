import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantAccess } from "@/lib/auth/server";
import { assertTenantWritable } from "@/lib/trial-guard";

export async function PATCH(req: Request, { params }: { params: { id: string; customerId: string } }) {
  const access = await requireTenantAccess(params.id);
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const blocked = await assertTenantWritable(params.id, { adminBypass: access.admin });
  if (blocked) return blocked;

  try {
    const existing = await prisma.customer.findFirst({ where: { id: params.customerId, tenantId: params.id }, select: { id: true } });
    if (!existing) return NextResponse.json({ message: "Customer not found." }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const data: Record<string, unknown> = {};
    if (typeof body?.name === "string" && body.name.trim().length >= 2) data.name = body.name.trim().slice(0, 120);
    if (typeof body?.phone === "string") data.phone = body.phone.trim().slice(0, 40) || null;
    if (typeof body?.address === "string") data.address = body.address.trim().slice(0, 200) || null;
    if (typeof body?.notes === "string") data.notes = body.notes.trim().slice(0, 300) || null;
    if (Object.keys(data).length === 0) return NextResponse.json({ message: "No valid changes." }, { status: 400 });

    const customer = await prisma.customer.update({ where: { id: params.customerId }, data: data as any });
    return NextResponse.json({ customer });
  } catch (error) {
    console.error("Update customer error:", error);
    return NextResponse.json({ message: "Failed to update customer." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string; customerId: string } }) {
  const access = await requireTenantAccess(params.id);
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const blocked = await assertTenantWritable(params.id, { adminBypass: access.admin });
  if (blocked) return blocked;

  try {
    const existing = await prisma.customer.findFirst({ where: { id: params.customerId, tenantId: params.id }, select: { id: true } });
    if (!existing) return NextResponse.json({ message: "Customer not found." }, { status: 404 });
    await prisma.customer.delete({ where: { id: params.customerId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete customer error:", error);
    return NextResponse.json({ message: "Failed to delete customer." }, { status: 500 });
  }
}