import { PrismaClient } from "@prisma/client";

/**
 * Normalizes and sanitizes PostgreSQL connection URLs to prevent Prisma connection errors:
 * - Strips accidental brackets around hostnames (e.g., @[mydb.rds.amazonaws.com] or @[56-228-23-80.sslip.io])
 *   which trigger Prisma's "invalid IPv6 address in database URL" parser error.
 * - Strips accidental brackets around passwords (e.g., :[password]@) or usernames (e.g., ://[user]:).
 * - Properly encodes special characters in passwords using encodeURIComponent.
 * - Strips surrounding quotes, whitespace, or markdown wrapper links.
 */
export function sanitizeDatabaseUrl(raw?: string): string {
  if (!raw) return "";
  let url = raw.trim().replace(/^[\s"'`]+|[\s"'`]+$/g, "");

  // 1. If wrapped in markdown link format [title](url)
  const mdMatch = url.match(/\[.*?\]\((.*?)\)/);
  if (mdMatch) url = mdMatch[1].trim();

  // 2. Strip brackets around host when it's NOT an IPv6 address (IPv6 contains multiple colons ':')
  url = url.replace(/@\[([^\]:]+)\](:|\/|\?|$)/g, "@$1$2");

  // 3. Strip brackets around password or username
  url = url.replace(/:\[([^\]]+)\]@/g, ":$1@");
  url = url.replace(/:\/\/\[([^\]]+)\]:/g, "://$1:");

  // 4. Strip stray unclosed bracket at beginning of host (e.g., @[mydb.rds.amazonaws.com:5432/...)
  url = url.replace(/@\[([^\]:]+)(:|\/|\?|$)/g, "@$1$2");

  // 5. Parse and percent-encode password if it has unencoded reserved characters
  const urlMatch = url.match(/^([a-zA-Z0-9+.-]+:\/\/)([^:]+):([^@]+)@(.*)$/);
  if (urlMatch) {
    const [, protocol, user, pass, rest] = urlMatch;
    let cleanRest = rest;
    if (cleanRest.startsWith("[") && !cleanRest.includes("]")) {
      cleanRest = cleanRest.slice(1);
    }
    cleanRest = cleanRest.replace(/^\[([^\]:]+)\](:|\/|\?|$)/g, "$1$2");

    try {
      const decodedUser = decodeURIComponent(user);
      const decodedPass = decodeURIComponent(pass);
      url = `${protocol}${encodeURIComponent(decodedUser)}:${encodeURIComponent(decodedPass)}@${cleanRest}`;
    } catch {
      // Fallback if decoding fails
    }
  }

  return url;
}

const rawDbUrl = process.env.DATABASE_URL;
const sanitizedDbUrl = rawDbUrl ? sanitizeDatabaseUrl(rawDbUrl) : undefined;

if (sanitizedDbUrl) {
  process.env.DATABASE_URL = sanitizedDbUrl;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: sanitizedDbUrl
      ? {
          db: {
            url: sanitizedDbUrl,
          },
        }
      : undefined,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
