import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createDatabase } from "../src/lib/db";
import { archiveAsset, archiveDirectory, archiveEmployee, issueAsset, returnAsset, saveAsset, saveDirectory, saveEmployee } from "../src/lib/inventory";
import { bootstrapAdministrator, createUser, setUserRole } from "../src/lib/users";
import { assetWhere, parseAssetQuery } from "../src/lib/asset-search";
import { assignmentEmployeesQuery } from "../src/lib/assignment-search";
import { reportSource, parseReport } from "../src/lib/reports";

const testUrl = process.env.TEST_DATABASE_URL;

test("PostgreSQL inventory lifecycle, concurrent issue, permissions, and history", { skip: !testUrl }, async () => {
  const url = URL.parse(testUrl ?? "");
  assert.ok(url, "Set a valid TEST_DATABASE_URL.");
  assert.equal(url.protocol, "postgresql:");
  assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(url.hostname));
  assert.match(url.pathname, /^\/openasset_test(?:_[a-z0-9]+)*$/);
  assert.equal(url.search, "");
  assert.equal(url.hash, "");

  const db = createDatabase(url.href);
  const key = randomUUID();
  try {
    const [identity] = await db.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
    assert.equal(identity.name, url.pathname.slice(1));
    const initial = { name: "Test Administrator", email: "admin-" + key + "@openasset.example", password: randomUUID() };
    const competing = { ...initial, email: "competing-" + key + "@openasset.example" };
    const bootstraps = await Promise.allSettled([bootstrapAdministrator(db, initial), bootstrapAdministrator(db, competing)]);
    const winner = bootstraps.find(result => result.status === "fulfilled");
    assert.equal(bootstraps.filter(result => result.status === "fulfilled").length, 1);
    const refused = bootstraps.find(result => result.status === "rejected");
    assert.match(String(refused?.reason), /requires an empty user table/);
    await assert.rejects(bootstrapAdministrator(db, initial), /requires an empty user table/);
    assert.equal(await db.user.count(), 1);
    assert.equal(await db.account.count(), 1);
    assert.ok(winner);
    const adminUser = winner.value;
    const auth = betterAuth({
      baseURL: "https://openasset.example", secret: randomUUID(),
      database: prismaAdapter(db, { provider: "postgresql" }),
      emailAndPassword: { enabled: true, disableSignUp: true },
      logger: { disabled: true },
    });
    const signedIn = await auth.api.signInEmail({ body: { email: adminUser.email, password: initial.password }, returnHeaders: true });
    assert.ok(signedIn.headers.getSetCookie().some(cookie => /\bSecure\b/i.test(cookie) && /\bHttpOnly\b/i.test(cookie)));
    const admin = { id: adminUser.id, role: "admin" } as const;
    const staffUser = await createUser(db, { name: "Test Staff", email: "staff-" + key + "@openasset.example", role: "staff", password: randomUUID() }, admin);
    const staff = { id: staffUser.id, role: "staff" } as const;
    await assert.rejects(saveDirectory(db, staff, "category", key), /permission/);
    await saveDirectory(db, admin, "category", "Category " + key);
    await saveDirectory(db, admin, "location", "Location " + key);
    const category = await db.category.findUniqueOrThrow({ where: { name: "Category " + key } });
    const location = await db.location.findUniqueOrThrow({ where: { name: "Location " + key } });
    await saveEmployee(db, admin, { name: "Test Employee", email: key + "@openasset.example", employeeNumber: "EMP-" + key, department: "IT", locationId: location.id });
    const employee = await db.employee.findUniqueOrThrow({ where: { email: key + "@openasset.example" } });
    const eligibleEmployees = await db.employee.findMany(assignmentEmployeesQuery);
    assert.deepEqual(eligibleEmployees.find(candidate => candidate.id === employee.id), {
      id: employee.id, name: employee.name, location: { name: location.name },
    });
    const values = { tag: "TEST-" + key, name: "Test laptop", categoryId: category.id, locationId: location.id,
      brand: null, model: null, serialNumber: null, purchaseDate: null, purchaseCost: null, warrantyExpiry: null,
      notes: null, status: "AVAILABLE" } as const;
    await assert.rejects(saveAsset(db, staff, values), /permission/);
    const asset = await saveAsset(db, admin, values);
    await assert.rejects(saveAsset(db, admin, values), error => typeof error === "object" && error !== null && "code" in error && error.code === "P2002");
    await saveAsset(db, admin, { ...values, name: "Renamed " + key }, asset.id);
    const matching = await db.asset.findMany({ where: assetWhere(parseAssetQuery({ q: key, category: category.id, location: location.id })) });
    assert.equal(matching[0]?.name, "Renamed " + key);
    assert.equal(matching.length, 1);
    await assert.rejects(archiveDirectory(db, admin, "category", category.id), /Move active/);

    const issue = { assetId: asset.id, employeeId: employee.id, expectedReturnDate: null };
    const attempts = await Promise.allSettled([issueAsset(db, staff, issue), issueAsset(db, admin, issue)]);
    assert.equal(attempts.filter(attempt => attempt.status === "fulfilled").length, 1);
    const assignments = await db.assignment.findMany({ where: { assetId: asset.id, returnedAt: null } });
    assert.equal(assignments.length, 1);
    await assert.rejects(db.assignment.create({ data: { ...issue, issuedById: admin.id, locationId: location.id } }),
      error => typeof error === "object" && error !== null && "code" in error && error.code === "P2002");
    assert.equal((await db.asset.findUniqueOrThrow({ where: { id: asset.id } })).status, "ISSUED");
    await assert.rejects(archiveEmployee(db, admin, employee.id), /Return/);

    await returnAsset(db, staff, { assignmentId: assignments[0].id, returnCondition: "GOOD", returnNotes: "Checked" });
    const returned = await db.assignment.findUniqueOrThrow({ where: { id: assignments[0].id } });
    assert.ok(returned.returnedAt);
    assert.equal(returned.returnedById, staff.id);
    assert.equal((await db.asset.findUniqueOrThrow({ where: { id: asset.id } })).status, "AVAILABLE");
    await archiveAsset(db, admin, asset.id);
    await archiveEmployee(db, admin, employee.id);
    const remainingEmployees = await db.employee.findMany(assignmentEmployeesQuery);
    assert.ok(!remainingEmployees.some(candidate => candidate.id === employee.id));
    await archiveDirectory(db, admin, "category", category.id);
    await archiveDirectory(db, admin, "location", location.id);
    assert.equal((await db.asset.findUniqueOrThrow({ where: { id: asset.id } })).status, "ARCHIVED");
    assert.ok((await db.employee.findUniqueOrThrow({ where: { id: employee.id } })).archivedAt);
    assert.equal(await db.assignment.count({ where: { assetId: asset.id } }), 1);
    assert.equal(await reportSource(db, parseReport({ report: "inventory", category: category.id })).count(), 1);
    await assert.rejects(setUserRole(db, staff, admin.id, "staff"), /permission/);
    await setUserRole(db, admin, staff.id, "admin");
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: staff.id } })).role, "admin");
    assert.equal(await db.auditLog.count({ where: { entityId: assignments[0].id } }), 2);
  } finally {
    await db.$disconnect();
  }
});
