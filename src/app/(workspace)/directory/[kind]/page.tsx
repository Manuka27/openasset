import Link from "next/link";
import { notFound } from "next/navigation";
import ActionForm from "@/components/ActionForm";
import { ListFilters, ListPagination } from "@/components/ListControls";
import SectionTitle from "@/components/SectionTitle";
import { AssetIcon, Badge, EmptyState } from "@/components/WorkspaceUI";
import StatCard from "@/components/StatCard";
import { Archive, Boxes, MapPin } from "lucide-react";
import { database } from "@/lib/db";
import { pageFor, queryPage, queryText } from "@/lib/list-query";
import { requireAdmin } from "@/lib/session";
import { archiveDirectoryAction, saveDirectoryAction } from "../../actions";

export const instant = false;

export default async function DirectoryPage({ params, searchParams }: PageProps<"/directory/[kind]">) {
  await requireAdmin();
  const { kind } = await params;
  if (kind !== "categories" && kind !== "locations") notFound();
  const model = kind === "categories" ? "category" : "location";
  const title = kind === "categories" ? "Categories" : "Locations";
  const path = "/directory/" + kind;
  const input = await searchParams;
  const q = queryText(input.q);
  const state = input.state === "archived" || input.state === "all" ? input.state : "active";
  const where = {
    name: q ? { contains: q, mode: "insensitive" as const } : undefined,
    archivedAt: state === "all" ? undefined : state === "archived" ? { not: null } : null,
  };
  const db = database();
  const total = model === "category" ? await db.category.count({ where }) : await db.location.count({ where });
  const { page, pages, skip, take } = pageFor(total, queryPage(input.page));
  const options = { where, orderBy: { name: "asc" as const }, skip, take, include: { _count: { select: { assets: true } } } };
  const rows = model === "category" ? await db.category.findMany(options) : await db.location.findMany(options);

  return (
    <>
      <SectionTitle title={title} description={model === "category" ? "Group equipment for inventory tracking and reporting." : "Manage where equipment and employees are based."} />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:max-w-xl">
        <StatCard title="Matching entries" value={total} color="accent" icon={model === "category" ? Archive : MapPin} />
        <StatCard title="Assets on this page" value={rows.reduce((count, row) => count + row._count.assets, 0)} color="blue" icon={Boxes} />
      </div>
      <section className="panel mb-5 max-w-xl">
        <h2 className="mb-4 text-xl font-semibold">Add {model}</h2>
        <ActionForm action={saveDirectoryAction.bind(null, model, null)} submit={"Add " + model} resetOnSuccess
          fields={[{ name: "name", label: "Name", required: true, maxLength: 120 }]} />
      </section>
      <ListFilters path={path} q={q} filters={[{ name: "state", label: "Status", value: state, options: [
        { value: "active", label: "Active" }, { value: "archived", label: "Archived" }, { value: "all", label: "All entries" },
      ] }]} />
      <section className="panel">
        {rows.length ? <div className="table-wrap" tabIndex={0} role="region" aria-label={title}>
          <table>
            <thead><tr><th scope="col">Name</th><th scope="col">Total assets</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
            <tbody>{rows.map(row => <tr key={row.id}>
              <td><div className="flex min-w-40 items-center gap-2.5">{model === "category" ? <AssetIcon category={row.name} /> : <span className="oa-asset-mark"><MapPin aria-hidden="true" /></span>}<span className="font-medium">{row.name}</span></div></td>
              <td><Link className="text-link" href={"/assets?" + new URLSearchParams({ [model]: row.id, status: "ALL" })}>{row._count.assets} assets</Link></td>
              <td><Badge tone={row.archivedAt ? "muted" : "green"}>{row.archivedAt ? "Archived" : "Active"}</Badge></td>
              <td className="min-w-52">{!row.archivedAt && <details>
                <summary className="text-link cursor-pointer">Manage {model}</summary>
                <div className="mt-3 grid gap-4">
                  <ActionForm action={saveDirectoryAction.bind(null, model, row.id)} submit="Save name"
                    fields={[{ name: "name", label: "Name", value: row.name, required: true, maxLength: 120 }]} />
                  <ActionForm action={archiveDirectoryAction.bind(null, model, row.id)} submit="Archive"
                    confirm={{ title: "Archive " + row.name + "?", detail: "The entry remains in inventory history. Active records must be moved first." }} />
                </div>
              </details>}</td>
            </tr>)}</tbody>
          </table>
        </div> : <EmptyState title={"No " + title.toLowerCase() + " match these filters."} />}
        <ListPagination path={path} query={{ q, state }} page={page} pages={pages} total={total} label={title.toLowerCase()} />
      </section>
    </>
  );
}
