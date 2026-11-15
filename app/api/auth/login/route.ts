import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import {
  createSessionCookie,
  normalizeEmail,
  normalizeIdentifier,
  sessionCookieOptions,
  verifyPassword,
  type SessionRole,
} from "@/lib/auth/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const identifier = normalizeIdentifier(String(body?.identifier ?? body?.email ?? body?.username ?? ""));
    const password = String(body?.password ?? "");
    if (!identifier || !password) {
      return NextResponse.json({ message: "Email/username and password are required." }, { status: 400 });
    }

    const email = normalizeEmail(identifier);
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username: identifier },
          { username: identifier.toLowerCase() },
        ],
      },
      select: {
        id: true, name: true, username: true, email: true, passwordHash: true, role: true, tenantId: true, isActive: true,
      },
    });
    if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ message: "Invalid credentials." }, { status: 401 });
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => {});

    const token = await createSessionCookie({
      sub: user.id,
      role: user.role as SessionRole,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
    });

    const isPosOnly = user.role === "CASHIER";
    const redirectTo = user.tenantId ? `/store/${user.tenantId}${isPosOnly ? "/pos" : ""}` : "/login";
    const res = NextResponse.json(
      { message: "Login successful", role: user.role, name: user.name, username: user.username, tenantId: user.tenantId, redirectTo },
      { status: 200 },
    );
    res.cookies.set({ ...sessionCookieOptions(), value: token });
    return res;
  } catch (error) {
    console.error("Login error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    if (/AUTH_SECRET/i.test(msg)) {
      return NextResponse.json({ message: "Server config error: AUTH_SECRET is missing or invalid." }, { status: 500 });
    }
    if (/Prisma|database|Can't reach|P100|Authentication failed|ECONN|connect/i.test(msg)) {
      return NextResponse.json({ message: "Database connection/config error. Check DATABASE_URL for the new 7communication database." }, { status: 500 });
    }
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
