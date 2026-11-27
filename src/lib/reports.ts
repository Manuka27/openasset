import type { Prisma, PrismaClient } from "../generated/prisma/client";
import { assignmentLinks, assignmentWhere, returnConditionLabels } from "./assignment-search";
import { displayDay, displayTime, statusLabels } from "./display";
import { queryPage, queryText, type SearchParams } from "./list-query";

export const reportOptions = [
  { value: "inventory", label: "Complete inventory" },
  { value: "available", label: "Available assets" },
  { value: "issued", label: "Issued assets" },
  { value: "maintenance", label: "Assets under maintenance" },
  { value: "assignments", label: "Assignment history" },
  { value: "overdue", label: "Overdue assignments" },
  { value: "categories", label: "Inventory by category" },
  { value: "locations", label: "Inventory by location" },
] as const;

const assetColumns = ["Asset ID", "Name", "Status", "Category", "Location", "Serial number", "Purchase date", "Purchase cost", "Warranty expiry"];
const assignmentColumns = ["Asset ID", "Asset", "Employee", "Location", "Issued at", "Issued by", "Due", "Returned at", "Returned by", "Condition"];
const statuses = { available: "AVAILABLE", issued: "ISSUED", maintenance: "MAINTENANCE" } as const;
type Row = (string | number | null)[];

export function parseReport(params: SearchParams) {
  return {
    report: reportOptions.find(option => option.value === params.report)?.value ?? "inventory",
    q: queryText(params.q), category: queryText(params.category, 128), location: queryText(params.location, 128),
    page: queryPage(params.page),
  };
}
type ReportQuery = ReturnType<typeof parseReport>;

export function reportColumns(query: ReportQuery) {
  if (query.report === "assignments" || query.report === "overdue") return assignmentColumns;
  if (query.report === "categories" || query.report === "locations") {
    return [query.report === "categories" ? "Category" : "Location", "Total", "Available", "Issued", "Maintenance", "Archived"];
  }
  return assetColumns;
}

export function reportSource(db: PrismaClient, query: ReportQuery) {
  const search = { contains: query.q, mode: "insensitive" } as const;
  const assetsWhere: Prisma.AssetWhereInput = {
    categoryId: query.category || undefined, locationId: query.location || undefined,
    status: query.report in statuses ? statuses[query.report as keyof typeof statuses] : undefined,
    OR: query.q ? [{ tag: search }, { name: search }, { serialNumber: search }] : undefined,
  };

  if (query.report === "categories" || query.report === "locations") {
    const category = query.report === "categories";
    const key = category ? "categoryId" : "locationId";
    const where = { id: (category ? query.category : query.location) || undefined, name: query.q ? search : undefined };
    const orderBy = { name: "asc" as const };
    const select = { id: true, name: true };
    return {
      count: () => category ? db.category.count({ where }) : db.location.count({ where }),
      async rows(skip: number, take: number): Promise<Row[]> {
        const options = { where, orderBy, select, skip, take };
        const entries = await (category ? db.category.findMany(options) : db.location.findMany(options));
        if (!entries.length) return [];
        const grouped = await db.asset.groupBy({
          by: [key, "status"], where: { ...assetsWhere, OR: undefined, [key]: { in: entries.map(entry => entry.id) } }, _count: { _all: true },
        });
        const totals = new Map<string, Partial<Record<keyof typeof statusLabels, number>>>();
        for (const row of grouped) {
          const id = row[key];
          const counts = totals.get(id) ?? {};
          counts[row.status] = row._count._all;
          totals.set(id, counts);
        }
        return entries.map(({ id, name }) => {
          const counts = totals.get(id) ?? {};
          const quantities = [counts.AVAILABLE ?? 0, counts.ISSUED ?? 0, counts.MAINTENANCE ?? 0, counts.ARCHIVED ?? 0];
          return [name, quantities.reduce((sum, count) => sum + count, 0), ...quantities];
        });
      },
    };
  }

  if (query.report === "assignments" || query.report === "overdue") {
    const where: Prisma.AssignmentWhereInput = {
      ...assignmentWhere({ state: query.report === "overdue" ? "overdue" : "all", q: query.q, asset: "", page: 1 }),
      asset: query.category ? { categoryId: query.category } : undefined,
      locationId: query.location || undefined,
    };
    return {
      count: () => db.assignment.count({ where }),
      async rows(skip: number, take: number): Promise<Row[]> {
        const records = await db.assignment.findMany({ where, skip, take, orderBy: [{ issuedAt: "desc" }, { id: "asc" }], include: assignmentLinks });
        return records.map(row => [
          row.asset.tag, row.asset.name, row.employee.name, row.location.name, displayTime(row.issuedAt),
          row.issuedBy.name, displayDay(row.expectedReturnDate), displayTime(row.returnedAt), row.returnedBy?.name ?? null,
          row.returnCondition ? returnConditionLabels[row.returnCondition] : null,
        ]);
      },
    };
  }

  return {
    count: () => db.asset.count({ where: assetsWhere }),
    async rows(skip: number, take: number): Promise<Row[]> {
      const records = await db.asset.findMany({ where: assetsWhere, skip, take, orderBy: { tag: "asc" },
        include: { category: { select: { name: true } }, location: { select: { name: true } } } });
      return records.map(row => [row.tag, row.name, statusLabels[row.status], row.category.name, row.location.name,
        row.serialNumber, displayDay(row.purchaseDate), row.purchaseCost?.toFixed(2) ?? null, displayDay(row.warrantyExpiry)]);
    },
  };
}

export function csvRow(values: Row) {
  return values.map(value => {
    const text = String(value ?? "");
    const safe = typeof value === "string" && (/^[\s\uFEFF]*[=+\-@＝＋－＠]/u.test(text) || /^[\t\r\n]/.test(text))
      ? "'" + text : text;
    return '"' + safe.replaceAll('"', '""') + '"';
  }).join(",") + "\r\n";
}
