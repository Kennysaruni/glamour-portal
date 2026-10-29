import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("=================================================");
  console.log("Glamour Homecare Portal - Purging All Demo Data");
  console.log("=================================================");

  // 1. Delete all domain records
  const delAudit = await prisma.auditLog.deleteMany({});
  console.log(`- Deleted ${delAudit.count} audit logs`);

  const delNotes = await prisma.clientNote.deleteMany({});
  console.log(`- Deleted ${delNotes.count} client visit notes & clinical logs`);

  const delIncidents = await prisma.incidentReport.deleteMany({});
  console.log(`- Deleted ${delIncidents.count} incident reports`);

  const delAppts = await prisma.appointment.deleteMany({});
  console.log(`- Deleted ${delAppts.count} appointments & scheduled shifts`);

  const delClients = await prisma.client.deleteMany({});
  console.log(`- Deleted ${delClients.count} clients`);

  const delSessions = await prisma.session.deleteMany({});
  console.log(`- Deleted ${delSessions.count} active sessions`);

  const delAccounts = await prisma.account.deleteMany({});
  console.log(`- Deleted ${delAccounts.count} user credential accounts`);

  const delTokens = await (prisma as any).passwordResetToken?.deleteMany?.({}).catch(() => ({ count: 0 }));
  console.log(`- Deleted ${delTokens?.count || 0} password reset tokens`);

  const delVerif = await prisma.verification.deleteMany({});
  console.log(`- Deleted ${delVerif.count} verifications`);

  const delUsers = await prisma.user.deleteMany({});
  console.log(`- Deleted ${delUsers.count} users`);

  // 2. Create the single Admin account: Shavonnah Upchurch (glamourhomecare@gmail.com)
  const defaultPasswordHash = await bcrypt.hash("Password123!", 10);
  const adminEmail = "glamourhomecare@gmail.com";

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

  // 3. Create initial audit log entry
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "ADMIN_INITIALIZATION",
      entityType: "User",
      entityId: admin.id,
    },
  });

  console.log("=================================================");
  console.log("Demo data purge completed successfully!");
  console.log("Single Administrator Account Active:");
  console.log(`- Name:     ${admin.name}`);
  console.log(`- Email:    ${admin.email}`);
  console.log(`- Role:     ${admin.role}`);
  console.log(`- Password: Password123!`);
  console.log("=================================================");
}

main()
  .catch((err) => {
    console.error("Error during database cleaning:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
