import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString("base64url");
  return `scrypt$16384$${salt}$${hash}`;
}

const ALL_FEATURE_KEYS = [
  "SERIAL_IMEI",
  "WARRANTY",
  "BATCH_EXPIRY",
  "PRESCRIPTION",
  "PAINT_SHADE",
  "MULTI_UNIT",
  "INSTALLMENTS",
  "SERVICE_JOBS",
  "BARCODE_FAST",
  "SUPPLIER_LEDGER",
  "ADVANCED_ANALYTICS",
  "OFFLINE_SYNC",
  "MULTI_USER",
  "DISCOUNTS",
];

async function main() {
  const email = "owner@7communication.com";
  const password = "ChangeMe123!";

  const existing = await prisma.tenant.findFirst({ where: { businessName: "7 Communication" } });
  if (existing) {
    console.log("Seed skipped: 7 Communication shop already exists.");
    return;
  }

  const tenant = await prisma.tenant.create({
    data: {
      uid: "SHOP-7COMM",
      businessName: "7 Communication",
      slug: "7communication",
      industryType: "MOBILE_ACCESSORIES",
      subscriptionTier: "PRO",
      accountType: "REAL",
      billingMode: "LOCAL_MANUAL",
      status: "ACTIVE",
      isActive: true,
      ownerName: "7 Communication Owner",
      email,
      phone: "",
      country: "Pakistan",
      location: "Pakistan",
      mrr: 0,
      users: {
        create: {
          name: "Owner",
          email,
          passwordHash: hashPassword(password),
          role: "OWNER",
          isActive: true,
        },
      },
    },
    select: { id: true },
  });

  await prisma.tenantFeature.createMany({
    data: ALL_FEATURE_KEYS.map((key) => ({ tenantId: tenant.id, key })),
    skipDuplicates: true,
  });

  console.log("Seeded 7 Communication mobile accessories shop.");
  console.log("Login email:", email);
  console.log("Login password:", password);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
