import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { hashPassword, isPlatformAdmin, normalizeEmail, requireTenantAccess, validatePassword } from "@/lib/auth/server";
import { assertTenantWritable } from "@/lib/trial-guard";

const STAFF_ROLES = new Set(["CASHIER"]);

function serializeStaff(user: any) {
  return { id: user.id, name: user.name, username: user.username ?? null, email: user.email, role: user.role, isActive: user.isActive, lastLoginAt: user.lastLoginAt, createdAt: user.createdAt };
}

async function guard(id: string, sessionRole: string, adminBypass = false) {
  if (!isPlatformAdmin(sessionRole) && !["OWNER", "MANAGER"].includes(sessionRole)) {
    return NextResponse.json({ message: "Only admin users can manage accounts." }, { status: 403 });
  }
  const blocked = await assertTenantWritable(id, { adminBypass });
  if (blocked) return blocked;
  return null;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const access = await requireTenantAccess(params.id);
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const blocked = await guard(params.id, access.session.role, access.admin);
  if (blocked) return blocked;

  const staff = await prisma.user.findMany({
    where: { tenantId: params.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, username: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
  });
  return NextResponse.json({ staff: staff.map(serializeStaff) });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const access = await requireTenantAccess(params.id);
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const blocked = await guard(params.id, access.session.role, access.admin);
  if (blocked) return blocked;

  try {
    const body = await req.json().catch(() => ({}));
    const email = normalizeEmail(String(body?.email ?? ""));
    const rawUsername = String(body?.username ?? "").trim();
    const username = rawUsername ? rawUsername.slice(0, 50) : null;
    const name = String(body?.name ?? "").trim().slice(0, 100) || username || email.split("@")[0] || "Cashier";
    const password = String(body?.password ?? "");
    const role = "CASHIER";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ message: "A valid email is required." }, { status: 400 });
    if (!username || !/^[a-zA-Z0-9._-]{3,50}$/.test(username)) return NextResponse.json({ message: "Username must be 3-50 chars (letters, numbers, dot, underscore, dash)." }, { status: 400 });
    const pwError = validatePassword(password);
    if (pwError) return NextResponse.json({ message: pwError }, { status: 400 });

    const conflict = await prisma.user.findFirst({ where: { OR: [{ email }, ...(username ? [{ username }] : [])] }, select: { id: true } });
    if (conflict) return NextResponse.json({ message: "This email or username is already registered." }, { status: 409 });

    const user = await prisma.user.create({
      data: { tenantId: params.id, name, username, email, passwordHash: hashPassword(password), role: role as any, isActive: true },
      select: { id: true, name: true, username: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
    });
    return NextResponse.json({ staff: serializeStaff(user) }, { status: 201 });
  } catch (error) {
    console.error("Create staff error:", error);
    return NextResponse.json({ message: "Failed to create staff account." }, { status: 500 });
  }
}
