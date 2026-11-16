import { NextResponse } from "next/server";

import { requireTenantAccess } from "@/lib/auth/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const DATA_URL = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/;

/**
 * Serve the shop logo as a normal image file.
 *
 * The logo is stored as a base64 data URL inside the profile row. Sending that
 * string inside every JSON response added ~40 KB to each page load and could
 * never be cached by the browser. As a separate image it is downloaded once and
 * then served from the browser cache.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const access = await requireTenantAccess(params.id);
  if (!access) return new NextResponse(null, { status: 401 });

  const tenant = await prisma.tenant
    .findUnique({ where: { id: params.id }, select: { logoDataUrl: true } })
    .catch(() => null);

  const match = DATA_URL.exec(tenant?.logoDataUrl ?? "");
  if (!match) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "private, max-age=60" } });

  const bytes = new Uint8Array(Buffer.from(match[2], "base64"));
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": match[1],
      "Content-Length": String(bytes.length),
      // The image URL carries a version, so long caching is safe.
      "Cache-Control": "private, max-age=604800, immutable",
    },
  });
}
