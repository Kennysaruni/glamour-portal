import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true, // PRD: Disabled public sign-ups. Only admin creates staff.
    password: {
      hash: async (password: string) => {
        return bcrypt.hash(password, 10);
      },
      verify: async ({
        password,
        hash,
      }: {
        password: string;
        hash: string;
      }) => {
        return bcrypt.compare(password, hash);
      },
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "EMPLOYEE",
        input: true,
      },
      phone: {
        type: "string",
        required: false,
        input: true,
      },
      isActive: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: true,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  advanced: {
    // Only enforce secure cookies if explicitly running on HTTPS
    useSecureCookies:
      process.env.NODE_ENV === "production" &&
      Boolean(process.env.BETTER_AUTH_URL?.startsWith("https://")),
    disableCSRFCheck: true,
  },
  trustedOrigins: async (request) => {
    const origin = request?.headers?.get?.("origin");
    const host = request?.headers?.get?.("host");
    const origins = [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ];
    if (origin) origins.push(origin);
    if (host) {
      origins.push(`http://${host}`);
      origins.push(`https://${host}`);
    }
    return origins;
  },
  secret:
    process.env.BETTER_AUTH_SECRET ||
    "7791c5965c21c4d7b09a4e66acdafb57b8f9ea6fb71bfa35752bbcfb0c4c914d",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
});
