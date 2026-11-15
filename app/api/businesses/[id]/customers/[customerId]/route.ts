import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantAccess } from "@/lib/auth/server";
import { assertTenantWritable } from "@/lib/trial-guard";

export async function GET(_req: Request, { params }: { params: { id: string; customerId: string } }) {
  const access = await requireTenantAccess(params.id);
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customer = await prisma.customer.findFirst({
    where: { id: params.customerId, tenantId: params.id },
    include: {
      invoices: {
        orderBy: { createdAt: "desc" },
        include: { items: { select: { id: true, quantity: true, unitPrice: true, lineTotal: true, serialOrImei: true, productName: true, brandName: true } } },
      },
    },
  });
  if (!customer) return NextResponse.json({ message: "Customer not found." }, { status: 404 });

  const duePkr = customer.invoices.reduce((s, inv) => s + Number(inv.duePkr || 0), 0);
  const totalPkr = customer.invoices.reduce((s, inv) => s + Number(inv.totalAmount || 0), 0);
  const paidPkr = customer.invoices.reduce((s, inv) => s + Number(inv.downPaymentPkr || 0), 0);
  return NextResponse.json({
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      notes: customer.notes,
      createdAt: customer.createdAt,
      invoiceCount: customer.invoices.length,
      duePkr,
      totalPkr,
      paidPkr,
      invoices: customer.invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        createdAt: inv.createdAt,
        totalAmount: Number(inv.totalAmount || 0),
        downPaymentPkr: Number(inv.downPaymentPkr || 0),
        duePkr: Number(inv.duePkr || 0),
        paymentMethod: inv.paymentMethod,
        items: inv.items.map((it) => ({
          id: it.id,
          productName: it.productName,
          brandName: it.brandName,
          quantity: it.quantity,
          unitPrice: Number(it.unitPrice || 0),
          lineTotal: Number(it.lineTotal || 0),
          serialOrImei: it.serialOrImei,
        })),
      })),
    },
  });
}

export async function POST(req: Request, { params }: { params: { id: string; customerId: string } }) {
  const access = await requireTenantAccess(params.id);
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const blocked = await assertTenantWritable(params.id, { adminBypass: access.admin });
  if (blocked) return blocked;

  try {
    const body = await req.json().catch(() => ({}));
    const amount = Number(body?.amountPkr);
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ message: "Enter a valid payment amount." }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({ where: { id: params.customerId, tenantId: params.id }, select: { id: true } });
      if (!customer) throw new Error("NOT_FOUND");
      const invoices = await tx.invoice.findMany({
        where: { tenantId: params.id, customerId: params.customerId, duePkr: { gt: 0 } },
        orderBy: { createdAt: "asc" },
        select: { id: true, duePkr: true, downPaymentPkr: true },
      });
      let remaining = amount;
      let applied = 0;
      for (const inv of invoices) {
        if (remaining <= 0) break;
        const due = Number(inv.duePkr || 0);
        const pay = Math.min(due, remaining);
        if (pay <= 0) continue;
        await tx.invoice.update({
          where: { id: inv.id },
          data: {
            duePkr: due - pay,
            downPaymentPkr: Number(inv.downPaymentPkr || 0) + pay,
          },
        });
        remaining -= pay;
        applied += pay;
      }
      return { applied, unapplied: remaining };
    });

    if ((result as any).applied === 0) return NextResponse.json({ message: "No due amount to receive for this customer." }, { status: 400 });
    return NextResponse.json({ ok: true, appliedPkr: (result as any).applied, unappliedPkr: (result as any).unapplied });
  } catch (error: any) {
    if (error?.message === "NOT_FOUND") return NextResponse.json({ message: "Customer not found." }, { status: 404 });
    console.error("Record customer payment error:", error);
    return NextResponse.json({ message: "Failed to record payment." }, { status: 500 });
  }
}

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