export type Role = "admin" | "staff";
export type Actor = { id: string; role: Role };

export class OperationError extends Error {}

export function requirePermission(actor: Actor, permission: "manage" | "assign") {
  if (actor.role === "admin" || (actor.role === "staff" && permission === "assign")) return;
  throw new OperationError("You don't have permission to do that.");
}
