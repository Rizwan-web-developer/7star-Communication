import { NextResponse } from "next/server";

import { requireTenantAccess } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { getTenantFeatureKeys } from "@/lib/tenant-features";

export const dynamic = "force-dynamic";

// Bill photos are stored as base64 text inside the database. Keeping them in
// the export makes the file complete, but a very large file is slow to download
// and may hit serverless limits, so above this size the photos are left out and
// only a count is written instead.
const MAX_IMAGE_CHARS = 3_000_000;

/**
 * Download every record that belongs to one shop as a single JSON file.
 *
 * Free Supabase projects have no automatic backups, so this gives the owner a
 * manual safety copy of products, invoices, customers, suppliers, ledger
 * entries and (when small enough) the attached bill photos.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const access = await requireTenantAccess(params.id);
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = params.id;

  // Check the photo volume first so the queries below fetch only what fits.
  const [imageStat] = await prisma.$queryRaw<{ chars: bigint | null }[]>`
    select coalesce(sum(length("dataUrl")), 0)::bigint as chars
    from "SupplierEntryImage"
    where "tenantId" = ${tenantId}
  `;
  const imageChars = Number(imageStat?.chars ?? 0);
  const includeImages = imageChars <= MAX_IMAGE_CHARS;

  const [tenant, features, users, products, brands, categories, customers, invoices, suppliers] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    getTenantFeatureKeys(tenantId),
    // Never export password hashes.
    prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.product.findMany({
      where: { tenantId },
      include: { serialItems: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.brand.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
    prisma.customer.findMany({ where: { tenantId }, orderBy: { createdAt: "asc" } }),
    prisma.invoice.findMany({
      where: { tenantId },
      include: { items: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.supplier.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
      include: {
        entries: {
          orderBy: { createdAt: "asc" },
          include: includeImages ? { images: true } : { _count: { select: { images: true } } },
        },
      },
    }),
  ]);

  if (!tenant) return NextResponse.json({ message: "Shop not found." }, { status: 404 });

  const supplierList = suppliers.map((supplier) => ({
    ...supplier,
    entries: supplier.entries.map((entry: any) => {
      if (includeImages) return entry;
      const { _count, ...rest } = entry;
      return { ...rest, imageCount: _count?.images ?? 0 };
    }),
  }));

  const payload = {
    format: "7communication-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    shop: { id: tenant.id, uid: tenant.uid, slug: tenant.slug, businessName: tenant.businessName },
    counts: {
      products: products.length,
      serialItems: products.reduce((sum, product) => sum + product.serialItems.length, 0),
      brands: brands.length,
      categories: categories.length,
      customers: customers.length,
      invoices: invoices.length,
      invoiceItems: invoices.reduce((sum, invoice) => sum + invoice.items.length, 0),
      suppliers: supplierList.length,
      supplierEntries: supplierList.reduce((sum, supplier) => sum + supplier.entries.length, 0),
    },
    images: {
      included: includeImages,
      note: includeImages
        ? "Bill photos supplied with ledger entries are included."
        : "Bill photos were left out because they exceeded the safe export size. All text records are complete.",
    },
    business: tenant,
    features,
    users,
    products,
    brands,
    categories,
    customers,
    invoices,
    suppliers: supplierList,
  };

  const slug =
    (tenant.slug || tenant.businessName || "shop")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "shop";
  const filename = `${slug}-backup-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
