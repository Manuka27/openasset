import { hashPassword } from "better-auth/crypto";
import type { z } from "zod";
import type { Prisma, PrismaClient } from "../generated/prisma/client";
import { audit, transaction } from "./inventory";
import { OperationError, requirePermission, type Actor, type Role } from "./permissions";
import type { userInput } from "./validation";

async function saveCredentialUser(db: PrismaClient, input: z.output<typeof userInput>, beforeCreate: (tx: Prisma.TransactionClient) => Promise<void>, actor?: Actor) {
  const { password, ...data } = input;
  const hashed = await hashPassword(password);
  return transaction(db, async tx => {
    await beforeCreate(tx);
    const user = await tx.user.create({ data: { ...data, emailVerified: true } });
    await tx.account.create({
      data: { userId: user.id, accountId: user.id, providerId: "credential", password: hashed },
    });
    if (actor) await audit(tx, actor, "User created", "User", user.id, { role: user.role });
    return user;
  });
}

export async function createUser(db: PrismaClient, input: z.output<typeof userInput>, actor?: Actor) {
  if (actor) requirePermission(actor, "manage");
  return saveCredentialUser(db, input, async tx => {
    if (actor && (await tx.user.findUnique({ where: { id: actor.id }, select: { role: true } }))?.role !== "admin") {
      throw new OperationError("This action requires an administrator.");
    }
  }, actor);
}

export async function bootstrapAdministrator(db: PrismaClient, input: Omit<z.output<typeof userInput>, "role">) {
  return saveCredentialUser(db, { ...input, role: "admin" }, async tx => {
    // The serializable transaction retries concurrent first-user attempts.
    if (await tx.user.count()) throw new OperationError("Administrator setup requires an empty user table.");
  });
}

export async function setUserRole(db: PrismaClient, actor: Actor, id: string, role: Role) {
  requirePermission(actor, "manage");
  if (id === actor.id) throw new OperationError("Your own role cannot be changed here.");
  return transaction(db, async tx => {
    const admin = await tx.user.findUnique({ where: { id: actor.id }, select: { role: true } });
    if (admin?.role !== "admin") throw new OperationError("This action requires an administrator.");
    const changed = await tx.user.updateMany({ where: { id, role: { not: role } }, data: { role } });
    if (!changed.count) throw new OperationError("Choose a different role for an existing user.");
    await tx.session.deleteMany({ where: { userId: id } });
    await audit(tx, actor, "User role changed", "User", id, { role });
  });
}
