import type { z } from "zod";
import type { Prisma, PrismaClient } from "../generated/prisma/client";
import { OperationError, requirePermission, type Actor } from "./permissions";
import type { assetInput, employeeInput, issueInput, returnInput } from "./validation";

type Transaction = Prisma.TransactionClient;
type Directory = "category" | "location";
type AssetInput = z.output<typeof assetInput>;

export async function transaction<T>(db: PrismaClient, work: (tx: Transaction) => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await db.$transaction(work, { isolationLevel: "Serializable" });
    } catch (error) {
      if (!hasCode(error, "P2034") || attempt >= 3) throw error;
    }
  }
}

export function hasCode(error: unknown, code: string) {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

export function audit(
  tx: Transaction, actor: Actor, action: string, entity: string, entityId: string,
  details: Prisma.InputJsonObject = {},
) {
  return tx.auditLog.create({ data: { actorId: actor.id, action, entity, entityId, details } });
}

async function requireActiveLocation(tx: Transaction, id: string) {
  const location = await tx.location.findFirst({ where: { id, archivedAt: null } });
  if (!location) throw new OperationError("Choose an active location.");
  return location;
}

export async function saveAsset(db: PrismaClient, actor: Actor, input: AssetInput, id?: string) {
  requirePermission(actor, "manage");
  return transaction(db, async tx => {
    const category = await tx.category.findFirst({ where: { id: input.categoryId, archivedAt: null } });
    if (!category) throw new OperationError("Choose an active category.");
    await requireActiveLocation(tx, input.locationId);

    const existing = id ? await tx.asset.findUnique({ where: { id } }) : null;
    if (id && (!existing || existing.status === "ARCHIVED")) {
      throw new OperationError("This asset is unavailable for editing.");
    }
    if (existing?.status === "ISSUED" && (input.locationId !== existing.locationId || input.status !== "AVAILABLE")) {
      throw new OperationError("Return the asset before changing its location or placing it in maintenance.");
    }
    const data = { ...input, status: existing?.status === "ISSUED" ? existing.status : input.status };
    const asset = existing
      ? await tx.asset.update({ where: { id: existing.id }, data })
      : await tx.asset.create({ data });
    await audit(tx, actor, existing ? "Asset updated" : "Asset registered", "Asset", asset.id, {
      tag: asset.tag, status: asset.status, ...(existing ? { previousTag: existing.tag, previousStatus: existing.status } : {}),
    });
    return asset;
  });
}

export async function archiveAsset(db: PrismaClient, actor: Actor, id: string) {
  requirePermission(actor, "manage");
  return transaction(db, async tx => {
    const changed = await tx.asset.updateMany({
      where: { id, status: { in: ["AVAILABLE", "MAINTENANCE"] }, assignments: { none: { returnedAt: null } } },
      data: { status: "ARCHIVED" },
    });
    if (!changed.count) throw new OperationError("Only available or maintenance assets can be archived.");
    await audit(tx, actor, "Asset archived", "Asset", id);
  });
}

export async function saveDirectory(db: PrismaClient, actor: Actor, kind: Directory, name: string, id?: string) {
  requirePermission(actor, "manage");
  return transaction(db, async tx => {
    const data = { name };
    let record: { id: string };
    if (id) {
      const where = { id, archivedAt: null };
      record = kind === "category"
        ? await tx.category.update({ where, data })
        : await tx.location.update({ where, data });
    } else {
      record = kind === "category"
        ? await tx.category.create({ data })
        : await tx.location.create({ data });
    }
    await audit(tx, actor, id ? "Directory entry updated" : "Directory entry added", kind, record.id, { name });
  });
}

export async function archiveDirectory(db: PrismaClient, actor: Actor, kind: Directory, id: string) {
  requirePermission(actor, "manage");
  return transaction(db, async tx => {
    const assets = await tx.asset.count({
      where: { status: { not: "ARCHIVED" }, ...(kind === "category" ? { categoryId: id } : { locationId: id }) },
    });
    if (assets || (kind === "location" && (
      await tx.employee.count({ where: { locationId: id, archivedAt: null } })
      || await tx.assignment.count({ where: { locationId: id, returnedAt: null } })
    ))) {
      throw new OperationError("Move active assets and employees and close open assignments before archiving this entry.");
    }
    const data = { archivedAt: new Date() };
    const where = { id, archivedAt: null };
    const changed = kind === "category"
      ? await tx.category.updateMany({ where, data })
      : await tx.location.updateMany({ where, data });
    if (!changed.count) throw new OperationError("This entry is already archived or unavailable.");
    await audit(tx, actor, "Directory entry archived", kind, id);
  });
}

export async function saveEmployee(
  db: PrismaClient, actor: Actor, data: z.output<typeof employeeInput>, id?: string,
) {
  requirePermission(actor, "manage");
  if (!id && !data.employeeNumber) throw new OperationError("Enter an employee ID.");
  return transaction(db, async tx => {
    await requireActiveLocation(tx, data.locationId);
    const employee = id
      ? await tx.employee.update({ where: { id, archivedAt: null }, data })
      : await tx.employee.create({ data });
    await audit(tx, actor, id ? "Employee updated" : "Employee added", "Employee", employee.id);
  });
}

export async function archiveEmployee(db: PrismaClient, actor: Actor, id: string) {
  requirePermission(actor, "manage");
  return transaction(db, async tx => {
    const active = await tx.assignment.count({ where: { employeeId: id, returnedAt: null } });
    if (active) throw new OperationError("Return this employee's assigned assets before archiving.");
    const changed = await tx.employee.updateMany({ where: { id, archivedAt: null }, data: { archivedAt: new Date() } });
    if (!changed.count) throw new OperationError("This employee is already archived or unavailable.");
    await audit(tx, actor, "Employee archived", "Employee", id);
  });
}

export async function issueAsset(db: PrismaClient, actor: Actor, input: z.output<typeof issueInput>) {
  requirePermission(actor, "assign");
  const issuedAt = new Date();
  if (input.expectedReturnDate && input.expectedReturnDate.toISOString().slice(0, 10) < issuedAt.toISOString().slice(0, 10)) {
    throw new OperationError("Expected return date must be today or later (UTC).");
  }

  return transaction(db, async tx => {
    const employee = await tx.employee.findUnique({
      where: { id: input.employeeId, archivedAt: null },
      select: { id: true, locationId: true, location: { select: { archivedAt: true } } },
    });
    if (!employee || employee.location.archivedAt) throw new OperationError("Choose an employee with an active location.");
    if (await tx.assignment.count({ where: { assetId: input.assetId, returnedAt: null } })) {
      throw new OperationError("This asset already has an open assignment.");
    }
    const changed = await tx.asset.updateMany({
      where: { id: input.assetId, status: "AVAILABLE" }, data: { status: "ISSUED" },
    });
    if (!changed.count) throw new OperationError("This asset is no longer available to issue.");
    const assignment = await tx.assignment.create({
      data: { ...input, issuedAt, locationId: employee.locationId, issuedById: actor.id },
    });
    await audit(tx, actor, "Asset issued", "Assignment", assignment.id, {
      assetId: assignment.assetId, employeeId: employee.id, locationId: employee.locationId,
    });
    return assignment;
  });
}

export async function returnAsset(db: PrismaClient, actor: Actor, input: z.output<typeof returnInput>) {
  requirePermission(actor, "assign");
  return transaction(db, async tx => {
    const assignment = await tx.assignment.findUnique({ where: { id: input.assignmentId } });
    if (!assignment || assignment.returnedAt) throw new OperationError("This assignment has already closed or is unavailable.");
    const status = input.returnCondition === "GOOD" ? "AVAILABLE" : "MAINTENANCE";
    const changed = await tx.asset.updateMany({
      where: { id: assignment.assetId, status: "ISSUED" }, data: { status },
    });
    if (!changed.count) throw new OperationError("The asset is no longer marked as issued.");
    await tx.assignment.update({
      where: { id: assignment.id, returnedAt: null },
      data: { returnedAt: new Date(), returnedById: actor.id, returnCondition: input.returnCondition, returnNotes: input.returnNotes },
    });
    await audit(tx, actor, "Asset returned", "Assignment", assignment.id, { assetId: assignment.assetId, condition: input.returnCondition, status });
  });
}
