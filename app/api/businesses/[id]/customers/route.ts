import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantAccess } from "@/lib/auth/server";
import { assertTenantWritable } from "@/lib/trial-guard";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const access = await requireTenantAccess(params.id);
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customers = await prisma.customer.findMany({
    where: { tenantId: params.id },
    orderBy: { createdAt: "desc" },
    include: {
      invoices: { select: { id: true, duePkr: true, totalAmount: true } },
    },
  });

  return NextResponse.json({
    customers: customers.map((c) => {
      const due = c.invoices.reduce((s, inv) => s + Number(inv.duePkr || 0), 0);
      const total = c.invoices.reduce((s, inv) => s + Number(inv.totalAmount || 0), 0);
      const { invoices, ...rest } = c;
      return { ...rest, invoiceCount: invoices.length, duePkr: due, totalPkr: total };
    }),
  });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const access = await requireTenantAccess(params.id);
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const blocked = await assertTenantWritable(params.id, { adminBypass: access.admin });
  if (blocked) return blocked;

  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body?.name ?? "").trim().slice(0, 120);
    if (name.length < 2) return NextResponse.json({ message: "Customer name is required." }, { status: 400 });
    const phone = String(body?.phone ?? "").trim().slice(0, 40) || null;
    const address = String(body?.address ?? "").trim().slice(0, 200) || null;
    const notes = String(body?.notes ?? "").trim().slice(0, 300) || null;

    const customer = await prisma.customer.create({
      data: { tenantId: params.id, name, phone, address, notes },
    });
    return NextResponse.json({ customer: { ...customer, invoiceCount: 0, duePkr: 0, totalPkr: 0 } }, { status: 201 });
  } catch (error) {
    console.error("Create customer error:", error);
    return NextResponse.json({ message: "Failed to create customer." }, { status: 500 });
  }
}