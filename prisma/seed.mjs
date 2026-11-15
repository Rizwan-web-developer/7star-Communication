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

async function ensureRizwanAdmin(tenantId) {
  const email = "rk3113798@gmail.com";
  const username = "rizwanpos";
  const password = "ChangeMe123!";
  const passwordHash = hashPassword(password);
  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    await prisma.user.update({
      where: { email },
      data: { username, tenantId, role: "MANAGER", isActive: true, passwordHash, name: byEmail.name || "Rizwan" },
    });
  } else {
    await prisma.user.create({
      data: { tenantId, name: "Rizwan", username, email, passwordHash, role: "MANAGER", isActive: true },
    });
  }
  console.log("Admin user ready:", email, "username:", username, "password:", password);
}

async function main() {
  const ownerEmail = "owner@7communication.com";
  const password = "ChangeMe123!";

  let tenant = await prisma.tenant.findFirst({ where: { businessName: "7 Communication" }, select: { id: true } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
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
        email: ownerEmail,
        phone: "",
        country: "Pakistan",
        location: "Pakistan",
        mrr: 0,
        users: {
          create: {
            name: "Owner",
            email: ownerEmail,
            passwordHash: hashPassword(password),
            role: "OWNER",
            isActive: true,
          },
        },
      },
      select: { id: true },
    });
    console.log("Seeded 7 Communication mobile accessories shop.");
  } else {
    console.log("7 Communication shop exists; ensuring required users/features.");
  }

  await prisma.tenantFeature.createMany({
    data: ALL_FEATURE_KEYS.map((key) => ({ tenantId: tenant.id, key })),
    skipDuplicates: true,
  });
  await ensureRizwanAdmin(tenant.id);

  console.log("Owner login email:", ownerEmail);
  console.log("Owner login password:", password);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
