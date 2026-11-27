import Link from "next/link";
import { statusOptions, type AssetQuery } from "@/lib/asset-search";

type Entry = { id: string; name: string; archivedAt: Date | null };

export default function InventoryFilters({ query, categories, locations, path }: {
  query: AssetQuery; categories: Entry[]; locations: Entry[]; path: string;
}) {
  return (
    <form action={path} method="get" className="panel mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <label>Search<input name="q" maxLength={120} defaultValue={query.q} placeholder="Asset ID, name, or serial number" /></label>
      <label>Status<select name="status" defaultValue={query.status ?? ""}>
        <option value="">Active statuses</option>
        <option value="ALL">All statuses</option>
        {statusOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select></label>
      <label>Category<select name="category" defaultValue={query.category}>
        <option value="">All categories</option>
        {categories.map(entry => <option key={entry.id} value={entry.id}>{entry.name}{entry.archivedAt ? " (archived)" : ""}</option>)}
      </select></label>
      <label>Location<select name="location" defaultValue={query.location}>
        <option value="">All locations</option>
        {locations.map(entry => <option key={entry.id} value={entry.id}>{entry.name}{entry.archivedAt ? " (archived)" : ""}</option>)}
      </select></label>
      <label>Sort by<select name="sort" defaultValue={query.sort}>
        <option value="tag">Asset ID</option><option value="name">Name</option><option value="status">Status</option><option value="createdAt">Registered date</option>
      </select></label>
      <label>Order<select name="order" defaultValue={query.order}>
        <option value="asc">Ascending</option><option value="desc">Descending</option>
      </select></label>
      <div className="flex items-center gap-3">
        <button className="button primary">Apply filters</button>
        <Link className="text-link" href={path}>Clear</Link>
      </div>
    </form>
  );
}
