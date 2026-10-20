const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sqliteSchema = path.join(root, "prisma", "schema.sqlite.prisma");
const activeSchema = path.join(root, "prisma", "schema.prisma");

// If schema.sqlite.prisma doesn't exist yet, save current as sqlite schema
if (!fs.existsSync(sqliteSchema)) {
  fs.copyFileSync(activeSchema, sqliteSchema);
} else {
  fs.copyFileSync(sqliteSchema, activeSchema);
}

console.log("Successfully activated local SQLite schema at prisma/schema.prisma!");
console.log("Next steps:");
console.log("1. Ensure DATABASE_URL=\"file:./dev.db\" in .env");
console.log("2. Run: npx prisma db push");
console.log("3. Run: npx tsx prisma/seed.ts");
