import Link from "next/link";
import { assetOrder, assetQueryString, assetWhere, PAGE_SIZE, type AssetQuery } from "@/lib/asset-search";
import { database } from "@/lib/db";
import { AssetIcon, AssetStatus, EmptyState } from "./WorkspaceUI";
import InventoryFilters from "./InventoryFilters";

export default async function InventoryList({ query, path }: { query: AssetQuery; path: string }) {
  const db = database();
  const where = assetWhere(query);
  const [categories, locations, total] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" } }),
    db.location.findMany({ orderBy: { name: "asc" } }),
    db.asset.count({ where }),
  ]);
  const last = Math.min(5000, Math.max(1, Math.ceil(total / PAGE_SIZE)));
  const page = Math.min(query.page, last);
  const assets = await db.asset.findMany({
    where, orderBy: assetOrder(query), skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
    include: { category: true, location: true },
  });
  const pageLink = (next: number) => path + "?" + assetQueryString({ ...query, page: next });

  return (
    <>
      <InventoryFilters query={query} categories={categories} locations={locations} path={path} />
      <div className="panel">
        {assets.length ? (
          <div className="table-wrap" tabIndex={0} role="region" aria-label="Asset inventory">
            <table>
              <thead><tr><th scope="col">Asset ID</th><th scope="col">Name</th><th scope="col">Category</th><th scope="col">Location</th><th scope="col">Status</th></tr></thead>
              <tbody>{assets.map(asset => (
                <tr key={asset.id}>
                  <td><Link className="text-link" href={"/assets/" + asset.id}>{asset.tag}</Link></td>
                  <td><div className="flex min-w-40 items-center gap-2.5"><AssetIcon category={asset.category.name} /><span className="font-medium">{asset.name}</span></div></td>
                  <td>{asset.category.name}</td><td>{asset.location.name}</td><td><AssetStatus status={asset.status} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <EmptyState title="No assets match these filters." detail="Try changing the search text or selecting a different filter." />}
        <nav aria-label="Inventory pages" className="mt-4 flex flex-wrap items-center gap-4">
          {page > 1 && <Link className="button" href={pageLink(page - 1)}>Previous</Link>}
          <span className="text-sm text-slate-300">{total} assets · Page {page} of {last}</span>
          {page < last && <Link className="button" href={pageLink(page + 1)}>Next</Link>}
        </nav>
      </div>
    </>
  );
}
