export type SearchParams = Record<string, string | string[] | undefined>;

export const listPageSize = 20;

export function queryText(value: string | string[] | undefined, max = 120) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function queryPage(value: string | string[] | undefined) {
  const page = Number(queryText(value, 8));
  return Number.isSafeInteger(page) && page > 0 ? Math.min(page, 5000) : 1;
}

export function pageFor(total: number, requested: number) {
  const pages = Math.min(5000, Math.max(1, Math.ceil(total / listPageSize)));
  const page = Math.min(pages, requested);
  return { page, pages, skip: (page - 1) * listPageSize, take: listPageSize };
}

export function listHref(path: string, query: Record<string, string | number>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== "" && (key !== "page" || value !== 1)) params.set(key, String(value));
  }
  return params.size ? path + "?" + params.toString() : path;
}
