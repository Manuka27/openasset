import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "../src/generated/prisma/client";
import { assignmentWhere, parseAssignments } from "../src/lib/assignment-search";
import { assetWhere, parseAssetQuery } from "../src/lib/asset-search";
import { archiveEmployee, issueAsset, returnAsset, transaction } from "../src/lib/inventory";
import { OperationError, type Actor } from "../src/lib/permissions";
import { csvRow } from "../src/lib/reports";
import { assetInput, changePasswordInput, employeeInput, returnInput } from "../src/lib/validation";

const admin: Actor = { id: "admin", role: "admin" };
const staff: Actor = { id: "staff", role: "staff" };

test("asset input normalizes identifiers and checks price, serial length and warranty dates", () => {
  const data = {
    tag: "  it-102 ", name: "Display", categoryId: "c", locationId: "l",
    brand: "", model: "", serialNumber: " ABC123 ", notes: "", status: "AVAILABLE",
    purchaseDate: "2026-01-01", purchaseCost: "120.45", warrantyExpiry: "2027-01-01",
  };
  const parsed = assetInput.parse(data);
  assert.equal(parsed.tag, "IT-102");
  assert.equal(parsed.serialNumber, "ABC123");
  assert.equal(parsed.purchaseCost, "120.45");
  assert.equal(assetInput.safeParse({ ...data, purchaseCost: "1.234" }).success, false);
  assert.equal(assetInput.safeParse({ ...data, warrantyExpiry: "2025-01-01" }).success, false);
  assert.equal(assetInput.safeParse({ ...data, serialNumber: "x".repeat(121) }).success, false);
});

test("employee IDs normalize, password changes require confirmation and returns require a condition", () => {
  assert.equal(employeeInput.parse({ name: "Example", employeeNumber: " e-001 ", email: "Test@openasset.example", department: "", locationId: "loc" }).employeeNumber, "E-001");
  assert.equal(changePasswordInput.safeParse({ currentPassword: "current-password", newPassword: "new-password-123", confirmPassword: "different-password" }).success, false);
  assert.equal(returnInput.safeParse({ assignmentId: "as-1", returnNotes: "", returnCondition: "UNKNOWN" }).success, false);
});

test("active inventory remains the default and the all-status view includes archives", () => {
  assert.deepEqual(assetWhere(parseAssetQuery({})).status, { not: "ARCHIVED" });
  assert.equal(assetWhere(parseAssetQuery({ status: "ALL" })).status, undefined);
  assert.equal(assetWhere(parseAssetQuery({ status: "ARCHIVED" })).status, "ARCHIVED");
});

test("overdue filters exclude returns and compare with the start of the day", () => {
  const today = new Date("2026-11-26T00:00:00Z");
  const where = assignmentWhere(parseAssignments({ state: "overdue", q: "mira" }), today);
  assert.equal(where.returnedAt, null);
  assert.deepEqual(where.expectedReturnDate, { lt: today });
  assert.equal(where.OR?.length, 3);
  assert.equal(parseAssignments({ asset: "asset-1" }).state, "all");
});

test("CSV quotes cells and neutralizes spreadsheet formulas", () => {
  assert.equal(csvRow(["=SUM(A1)", "  +1", "@name", "-1", 'Hello, "world"', 5, null]),
    '"\'=SUM(A1)","\'  +1","\'@name","\'-1","Hello, ""world""","5",""\r\n');
  assert.equal(csvRow(["\t=1", "normal\ntext"]), '"\'\t=1","normal\ntext"\r\n');
});

function fakeInventory({ status = "AVAILABLE", open = false, archived = false } = {}) {
  const state = { status, open, assignmentCount: open ? 1 : 0, audits: [] as string[] };
  const tx = {
    employee: {
      findUnique: async () => archived ? null : { id: "employee", locationId: "location", location: { archivedAt: null } },
      updateMany: async () => ({ count: 1 }),
    },
    asset: {
      updateMany: async ({ where, data }: { where: { status: string }; data: { status: string } }) => {
        if (where.status !== state.status) return { count: 0 };
        state.status = data.status;
        return { count: 1 };
      },
    },
    assignment: {
      count: async () => Number(state.open),
      create: async () => {
        state.open = true;
        state.assignmentCount += 1;
        return { id: "assignment", assetId: "asset" };
      },
      findUnique: async () => state.assignmentCount ? { id: "assignment", assetId: "asset", returnedAt: state.open ? null : new Date() } : null,
      update: async ({ data }: { data: { returnCondition: string } }) => {
        assert.ok(data.returnCondition);
        state.open = false;
      },
    },
    auditLog: {
      create: async ({ data }: { data: { action: string } }) => { state.audits.push(data.action); },
    },
  };
  // This test double implements only the Prisma operations used by the services.
  const db = { $transaction: async (work: (client: typeof tx) => Promise<unknown>) => work(tx) } as unknown as PrismaClient;
  return { db, state };
}

test("staff can issue once and return an asset, preserving history and moving damage to maintenance", async () => {
  const { db, state } = fakeInventory();
  const issue = { assetId: "asset", employeeId: "employee", expectedReturnDate: null };
  await issueAsset(db, staff, issue);
  assert.equal(state.status, "ISSUED");
  await assert.rejects(issueAsset(db, staff, issue), /open assignment/);
  assert.equal(state.assignmentCount, 1);
  await returnAsset(db, staff, { assignmentId: "assignment", returnCondition: "DAMAGED", returnNotes: "Cracked" });
  assert.equal(state.status, "MAINTENANCE");
  assert.equal(state.open, false);
  assert.equal(state.assignmentCount, 1);
  await assert.rejects(returnAsset(db, staff, { assignmentId: "assignment", returnCondition: "GOOD", returnNotes: null }), /already closed/);
  await assert.rejects(issueAsset(db, staff, issue), /no longer available/);
  assert.deepEqual(state.audits, ["Asset issued", "Asset returned"]);
});

test("employee archive and issuing respect role and open-assignment rules", async () => {
  const { db } = fakeInventory({ open: true });
  await assert.rejects(archiveEmployee(db, staff, "employee"), OperationError);
  await assert.rejects(archiveEmployee(db, admin, "employee"), /Return this employee/);
  const archived = fakeInventory({ archived: true });
  await assert.rejects(issueAsset(archived.db, admin, { assetId: "asset", employeeId: "employee", expectedReturnDate: null }), /active location/);
});

test("transactions retry serializable write conflicts", async () => {
  let calls = 0;
  const db = { $transaction: async () => {
    calls += 1;
    if (calls < 3) throw Object.assign(new Error("serialization conflict"), { code: "P2034" });
    return "success";
  } } as unknown as PrismaClient;
  assert.equal(await transaction(db, async () => "unused"), "success");
  assert.equal(calls, 3);
});
