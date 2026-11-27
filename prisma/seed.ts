import "dotenv/config";
import { randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import type { Prisma } from "../src/generated/prisma/client";
import { createDatabase } from "../src/lib/db";
import { transaction } from "../src/lib/inventory";
import { userInput } from "../src/lib/validation";

const adminId = "openasset-demo-admin";
const adminEmail = "admin@openasset.example";

const categories = {
  computers: "Demo Computers",
  displays: "Demo Displays",
  networking: "Demo Networking",
  accessories: "Demo Accessories",
};

const locations = {
  office: "Demo Alder Office",
  lab: "Demo Birch Lab",
  depot: "Demo Cedar Depot",
};

const employees = {
  mira: { name: "Mira Alder", location: "office" },
  arun: { name: "Arun Birch", location: "lab" },
  nisha: { name: "Nisha Cedar", location: "depot" },
  theo: { name: "Theo Finch", location: "office" },
  leena: { name: "Leena Grove", location: "lab" },
} satisfies Record<string, { name: string; location: keyof typeof locations }>;

type DemoAsset = {
  tag: string;
  name: string;
  category: keyof typeof categories;
  location: keyof typeof locations;
} & (
  | { status?: "MAINTENANCE" | "ARCHIVED"; assignment?: never }
  | { status?: never; assignment: { employee: keyof typeof employees; returned?: true } }
);

const assets: DemoAsset[] = [
  { tag: "DEMO-001", name: "14-inch field laptop", category: "computers", location: "office", assignment: { employee: "mira" } },
  { tag: "DEMO-002", name: "Compact desktop workstation", category: "computers", location: "lab", status: "MAINTENANCE" },
  { tag: "DEMO-003", name: "13-inch spare laptop", category: "computers", location: "depot" },
  { tag: "DEMO-004", name: "27-inch QHD monitor", category: "displays", location: "lab", assignment: { employee: "arun" } },
  { tag: "DEMO-005", name: "24-inch office monitor", category: "displays", location: "office" },
  { tag: "DEMO-006", name: "Retired 19-inch monitor", category: "displays", location: "depot", status: "ARCHIVED" },
  { tag: "DEMO-007", name: "Eight-port network switch", category: "networking", location: "lab" },
  { tag: "DEMO-008", name: "Wi-Fi access point", category: "networking", location: "office", status: "MAINTENANCE" },
  { tag: "DEMO-009", name: "Travel router", category: "networking", location: "depot" },
  { tag: "DEMO-010", name: "USB-C docking station", category: "accessories", location: "depot", assignment: { employee: "nisha", returned: true } },
  { tag: "DEMO-011", name: "Noise-cancelling headset", category: "accessories", location: "office" },
  { tag: "DEMO-012", name: "Portable presentation remote", category: "accessories", location: "lab" },
];

function demoId(kind: string, key: string) {
  return `openasset-demo-${kind}-${key}`;
}

function localUrl(value: string | undefined) {
  try {
    const url = new URL(value ?? "");
    if (["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) return url;
  } catch {
    // URL errors can contain credentials, so callers report a fixed message.
  }
}

function seedConfiguration() {
  const databaseUrl = localUrl(process.env.DATABASE_URL);
  const authUrl = localUrl(process.env.BETTER_AUTH_URL);
  const secret = process.env.BETTER_AUTH_SECRET;

  if (process.env.NODE_ENV !== "development" || databaseUrl?.protocol !== "postgresql:"
    || databaseUrl.pathname !== "/openasset" || databaseUrl.search || databaseUrl.hash) {
    throw new Error("Demo seeding requires NODE_ENV=development and the local openasset PostgreSQL database.");
  }
  if (!authUrl || !["http:", "https:"].includes(authUrl.protocol) || !secret || secret.length < 32) {
    throw new Error("Set a local BETTER_AUTH_URL and a BETTER_AUTH_SECRET of at least 32 characters.");
  }

  const admin = userInput.safeParse({
    name: "OpenAsset Demo Admin",
    email: adminEmail,
    role: "admin",
    password: process.env.OPENASSET_DEMO_ADMIN_PASSWORD,
  });
  if (!admin.success) throw new Error("Set OPENASSET_DEMO_ADMIN_PASSWORD to a private password of 14 to 128 characters.");

  return { databaseUrl: databaseUrl.href, authUrl: authUrl.origin, secret, admin: admin.data };
}

async function ensureAdmin(tx: Prisma.TransactionClient, config: ReturnType<typeof seedConfiguration>) {
  const existing = await tx.user.findUnique({
    where: { email: adminEmail },
    select: { id: true, role: true, accounts: { where: { providerId: "credential", accountId: adminId }, select: { password: true } } },
  });
  if (existing) {
    if (existing.id !== adminId || existing.role !== "admin" || !existing.accounts.some(account => account.password)) {
      throw new Error("The demo admin email is already in use or the demo account was changed.");
    }
    return existing.id;
  }

  // This instance is private to the CLI. The web app keeps public sign-up disabled.
  const auth = betterAuth({
    baseURL: config.authUrl,
    secret: config.secret,
    database: prismaAdapter(tx, { provider: "postgresql" }),
    emailAndPassword: { enabled: true, autoSignIn: false, minPasswordLength: 14, maxPasswordLength: 128 },
    user: { additionalFields: { role: { type: "string", input: false, defaultValue: "admin" } } },
    advanced: { database: { generateId: ({ model }) => model === "user" ? adminId : randomUUID() } },
    logger: { disabled: true },
    telemetry: { enabled: false },
  });
  const { user } = await auth.api.signUpEmail({
    body: { name: config.admin.name, email: config.admin.email, password: config.admin.password },
  });
  if (user.id !== adminId || user.role !== "admin") throw new Error("Better Auth did not create the expected demo administrator.");
  return user.id;
}

async function seedInventory(tx: Prisma.TransactionClient, issuedById: string) {
  const activeCategories = new Set<string>();
  for (const [key, name] of Object.entries(categories)) {
    const id = demoId("category", key);
    const category = await tx.category.upsert({ where: { id }, create: { id, name }, update: {} });
    if (!category.archivedAt) activeCategories.add(id);
  }

  const activeLocations = new Set<string>();
  for (const [key, name] of Object.entries(locations)) {
    const id = demoId("location", key);
    const location = await tx.location.upsert({ where: { id }, create: { id, name }, update: {} });
    if (!location.archivedAt) activeLocations.add(id);
  }

  for (const [key, { name, location }] of Object.entries(employees)) {
    const id = demoId("employee", key);
    const locationId = demoId("location", location);
    if (await tx.employee.findUnique({ where: { id }, select: { id: true } })) continue;
    if (!activeLocations.has(locationId)) throw new Error("A demo employee needs an active location.");
    await tx.employee.create({ data: { id, name, locationId, email: `${key}@openasset.example` } });
  }

  const now = Date.now();
  const daysAgo = (days: number) => new Date(now - days * 86_400_000);
  for (const asset of assets) {
    const id = demoId("asset", asset.tag);
    // Existing demo assets and their assignment history are left as users edited them.
    if (await tx.asset.findUnique({ where: { id }, select: { id: true } })) continue;
    const categoryId = demoId("category", asset.category);
    const locationId = demoId("location", asset.location);
    if (!activeCategories.has(categoryId) || !activeLocations.has(locationId)) {
      throw new Error("A demo asset needs an active category and location.");
    }

    let assignment: Prisma.AssignmentUncheckedCreateWithoutAssetInput | undefined;
    if (asset.assignment) {
      const employeeId = demoId("employee", asset.assignment.employee);
      const employee = await tx.employee.findUniqueOrThrow({
        where: { id: employeeId },
        select: { location: { select: { id: true, archivedAt: true } } },
      });
      if (employee.location.archivedAt) throw new Error("A demo assignment needs an employee at an active location.");
      const returned = asset.assignment.returned;
      assignment = {
        id: demoId("assignment", asset.tag),
        employeeId,
        locationId: employee.location.id,
        issuedById,
        issuedAt: daysAgo(returned ? 14 : 2),
        ...(returned ? { returnedAt: daysAgo(7), returnedById: issuedById, returnNotes: "Returned in working order." } : {}),
      };
    }

    await tx.asset.create({
      data: {
        id, tag: asset.tag, name: asset.name, categoryId, locationId,
        status: asset.status ?? (assignment && !assignment.returnedAt ? "ISSUED" : "AVAILABLE"),
        // Create at most one example assignment, together with its new asset.
        ...(assignment ? { assignments: { create: assignment } } : {}),
      },
    });
  }
}

async function seed() {
  if (process.env.OPENASSET_DEMO_SEED !== "true") {
    console.log("Demo seeding is disabled. Set OPENASSET_DEMO_SEED=true to opt in.");
    return;
  }

  let config: ReturnType<typeof seedConfiguration>;
  try {
    config = seedConfiguration();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Demo seed configuration is invalid.");
    process.exitCode = 1;
    return;
  }

  const db = createDatabase(config.databaseUrl);
  try {
    await transaction(db, async tx => {
      const admin = await ensureAdmin(tx, config);
      await seedInventory(tx, admin);
    });
    console.log("OpenAsset demo seed completed.");
  } finally {
    await db.$disconnect();
  }
}

seed().catch(() => {
  console.error("Demo seed failed. Check that the local migration is applied and demo IDs, names, and email are available.");
  process.exitCode = 1;
});
