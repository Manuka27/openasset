import { z } from "zod";
import type { Prisma } from "../generated/prisma/client";
import { statusLabels } from "./display";

const statuses = ["AVAILABLE", "ISSUED", "MAINTENANCE", "ARCHIVED"] as const;
const sorts = ["tag", "name", "status", "createdAt"] as const;
const queryInput = z.object({
  q: z.string().trim().max(120).catch(""),
  status: z.enum([...statuses, "ALL"]).optional().catch(undefined),
  category: z.string().max(128).catch(""),
  location: z.string().max(128).catch(""),
  sort: z.enum(sorts).catch("tag"),
  order: z.enum(["asc", "desc"]).catch("asc"),
  page: z.coerce.number().int().positive().max(5000).catch(1),
});

export const PAGE_SIZE = 20;

export function parseAssetQuery(params: Record<string, string | string[] | undefined>) {
  return queryInput.parse(params);
}
export type AssetQuery = ReturnType<typeof parseAssetQuery>;

export function assetWhere(query: AssetQuery): Prisma.AssetWhereInput {
  return {
    status: query.status === "ALL" ? undefined : query.status ?? { not: "ARCHIVED" },
    categoryId: query.category || undefined,
    locationId: query.location || undefined,
    OR: query.q ? [
      { tag: { contains: query.q, mode: "insensitive" } },
      { name: { contains: query.q, mode: "insensitive" } },
      { serialNumber: { contains: query.q, mode: "insensitive" } },
    ] : undefined,
  };
}

export function assetOrder(query: AssetQuery): Prisma.AssetOrderByWithRelationInput[] {
  return [{ [query.sort]: query.order }, { id: "asc" }];
}

export function assetQueryString(query: AssetQuery) {
  return new URLSearchParams(Object.entries(query).flatMap(([key, value]) =>
    value === undefined || value === "" ? [] : [[key, String(value)]],
  )).toString();
}

export const statusOptions = statuses.map(value => ({ value, label: statusLabels[value] }));
