const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pgSchema = path.join(root, "prisma", "schema.postgresql.prisma");
const activeSchema = path.join(root, "prisma", "schema.prisma");

if (!fs.existsSync(pgSchema)) {
  console.error("Error: prisma/schema.postgresql.prisma does not exist.");
  process.exit(1);
}

fs.copyFileSync(pgSchema, activeSchema);
console.log("Successfully activated AWS RDS PostgreSQL schema at prisma/schema.prisma!");
console.log("Next steps for AWS RDS deployment:");
console.log("1. Ensure DATABASE_URL in .env points to your RDS PostgreSQL instance.");
console.log("2. Run: npx prisma migrate deploy (or npx prisma db push)");
console.log("3. Run: npm run seed (to populate initial admin & sample staff)");
