import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { database } from "./db";

function configureAuth() {
  const secret = process.env.BETTER_AUTH_SECRET;
  const baseURL = URL.parse(process.env.BETTER_AUTH_URL ?? "");
  if (!secret || secret.length < 32 || !baseURL) {
    throw new Error("Set BETTER_AUTH_URL and a BETTER_AUTH_SECRET of at least 32 characters.");
  }
  if (baseURL.href !== baseURL.origin + "/" || !["http:", "https:"].includes(baseURL.protocol)) {
    throw new Error("BETTER_AUTH_URL must be a single HTTP or HTTPS origin.");
  }
  if (process.env.NODE_ENV === "production" && baseURL.protocol !== "https:") {
    throw new Error("BETTER_AUTH_URL must use HTTPS in production.");
  }
  if (process.env.NODE_ENV === "production" && process.env.BETTER_AUTH_TRUSTED_ORIGINS) {
    throw new Error("Use the canonical BETTER_AUTH_URL as the only production trusted origin.");
  }
  return betterAuth({
    appName: "OpenAsset",
    secret,
    baseURL: baseURL.origin,
    database: prismaAdapter(database(), { provider: "postgresql", transaction: true }),
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 14, maxPasswordLength: 128 },
    rateLimit: {
      enabled: true,
      storage: "database",
      customRules: { "/sign-in/email": { window: 60, max: 8 } },
    },
    session: { expiresIn: 60 * 60 * 24, updateAge: 60 * 60 },
    advanced: { useSecureCookies: baseURL.protocol === "https:" },
    plugins: [nextCookies()],
  });
}

let auth: ReturnType<typeof configureAuth> | undefined;

export function getAuth() {
  auth ??= configureAuth();
  return auth;
}
