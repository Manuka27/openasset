import Link from "next/link";
import { listHref } from "@/lib/list-query";

type Filter = { name: string; label: string; value: string; options: { value: string; label: string }[] };

export function ListFilters({ path, q, searchLabel = "Search", filters = [], hidden = {} }: {
  path: string; q: string; searchLabel?: string; filters?: Filter[]; hidden?: Record<string, string>;
}) {
  return (
    <form action={path} method="get" className="panel mb-5 flex flex-wrap items-end gap-3">
      {Object.entries(hidden).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      <label className="min-w-48 flex-1">{searchLabel}<input name="q" defaultValue={q} maxLength={120} /></label>
      {filters.map(filter => (
        <label key={filter.name}>{filter.label}
          <select name={filter.name} defaultValue={filter.value}>
            {filter.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      ))}
      <button className="button primary">Apply filters</button>
      <Link className="text-link self-center" href={path}>Clear</Link>
    </form>
  );
}

export function ListPagination({ path, query, page, pages, total, label }: {
  path: string; query: Record<string, string | number>; page: number; pages: number; total: number; label: string;
}) {
  const href = (next: number) => listHref(path, { ...query, page: next });
  return (
    <nav aria-label={label + " pagination"} className="mt-4 flex flex-wrap items-center gap-4">
      {page > 1 && <Link className="button" href={href(page - 1)}>Previous</Link>}
      <span className="text-sm text-slate-300">{total} {label} · Page {page} of {pages}</span>
      {page < pages && <Link className="button" href={href(page + 1)}>Next</Link>}
    </nav>
  );
}
