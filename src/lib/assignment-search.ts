import type { Prisma } from "../generated/prisma/client";
import { queryPage, queryText, type SearchParams } from "./list-query";

export const assignmentStates = [
  { value: "active", label: "Active" }, { value: "overdue", label: "Overdue" },
  { value: "returned", label: "Returned" }, { value: "all", label: "All assignments" },
] as const;

export const returnConditionLabels = { GOOD: "Good", NEEDS_SERVICE: "Needs service", DAMAGED: "Damaged" };

export const assignmentEmployeesQuery = {
  where: { archivedAt: null, location: { archivedAt: null } },
  select: { id: true, name: true, location: { select: { name: true } } },
  orderBy: { name: "asc" },
} satisfies Prisma.EmployeeFindManyArgs;

export const assignmentLinks = {
  asset: { select: { id: true, tag: true, name: true } },
  employee: { select: { id: true, name: true } },
  location: { select: { name: true } },
  issuedBy: { select: { name: true } },
  returnedBy: { select: { name: true } },
} satisfies Prisma.AssignmentSelect;

export function parseAssignments(params: SearchParams) {
  const state = assignmentStates.find(item => item.value === params.state)?.value ?? (params.asset ? "all" : "active");
  return { state, q: queryText(params.q), asset: queryText(params.asset, 128), page: queryPage(params.page) };
}

export function utcToday(now = new Date()) {
  return new Date(now.toISOString().slice(0, 10) + "T00:00:00.000Z");
}

export function assignmentWhere(query: ReturnType<typeof parseAssignments>, today = utcToday()): Prisma.AssignmentWhereInput {
  const contains = { contains: query.q, mode: "insensitive" } as const;
  return {
    assetId: query.asset || undefined,
    returnedAt: query.state === "returned" ? { not: null } : query.state === "all" ? undefined : null,
    expectedReturnDate: query.state === "overdue" ? { lt: today } : undefined,
    OR: query.q ? [{ asset: { tag: contains } }, { asset: { name: contains } }, { employee: { name: contains } }] : undefined,
  };
}
