import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Glamour Homecare Portal database with initial administrator...");

  const defaultPasswordHash = await bcrypt.hash("Password123!", 10);
  const adminEmail = "glamourhomecare@gmail.com";

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
    include: { accounts: true },
  });

  if (!existingAdmin) {
    const admin = await prisma.user.create({
      data: {
        id: "usr_shavonnah_admin",
        name: "Shavonnah Upchurch",
        email: adminEmail,
        emailVerified: true,
        role: "ADMIN",
        phone: "(540) 555-0199",
        isActive: true,
        accounts: {
          create: {
            accountId: "usr_shavonnah_admin",
            providerId: "credential",
            password: defaultPasswordHash,
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: "ADMIN_INITIALIZATION",
        entityType: "User",
        entityId: admin.id,
      },
    });

    console.log(`Created administrator: ${admin.name} (${admin.email})`);
  } else {
    // Ensure admin has role ADMIN and active account
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        name: "Shavonnah Upchurch",
        role: "ADMIN",
        isActive: true,
      },
    });
    console.log(`Administrator already exists: ${existingAdmin.name} (${existingAdmin.email})`);
  }

  console.log("------------------------------------------------------------------");
  console.log(`Database Seed Complete (Clean Production State):`);
  console.log(`- 1 Administrator: Shavonnah Upchurch (glamourhomecare@gmail.com)`);
  console.log(`- 0 Demo Clients`);
  console.log(`- 0 Demo Notes`);
  console.log(`- 0 Demo Caregivers`);
  console.log("------------------------------------------------------------------");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
