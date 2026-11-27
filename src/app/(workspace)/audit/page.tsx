import Link from "next/link";
import { ListFilters, ListPagination } from "@/components/ListControls";
import SectionTitle from "@/components/SectionTitle";
import { Avatar, Badge, EmptyState } from "@/components/WorkspaceUI";
import { database } from "@/lib/db";
import { displayTime } from "@/lib/display";
import { pageFor, queryPage, queryText } from "@/lib/list-query";
import { requireAdmin } from "@/lib/session";

export const instant = false;

export default async function AuditPage({ searchParams }: PageProps<"/audit">) {
  await requireAdmin();
  const input = await searchParams;
  const q = queryText(input.q);
  const contains = { contains: q, mode: "insensitive" } as const;
  const where = { OR: q ? [{ action: contains }, { entity: contains }, { entityId: contains }, { actor: { name: contains } }] : undefined };
  const db = database();
  const total = await db.auditLog.count({ where });
  const { page, pages, skip, take } = pageFor(total, queryPage(input.page));
  const records = await db.auditLog.findMany({ where, skip, take, orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: { id: true, action: true, entity: true, entityId: true, createdAt: true, actor: { select: { name: true } } } });
  return (
    <>
      <SectionTitle title="Audit log" description="Review inventory changes and administrative actions." />
      <ListFilters path="/audit" q={q} searchLabel="Search action, record or actor" />
      <section className="panel">
        {records.length ? <div className="table-wrap" tabIndex={0} role="region" aria-label="Inventory audit log">
          <table>
            <thead><tr><th scope="col">Time</th><th scope="col">Actor</th><th scope="col">Action</th><th scope="col">Record</th></tr></thead>
            <tbody>{records.map(row => {
              const id = encodeURIComponent(row.entityId);
              const href = row.entity === "Asset" ? "/assets/" + id : row.entity === "Employee" ? "/employees/" + id : undefined;
              return <tr key={row.id}><td><time className="whitespace-nowrap" dateTime={row.createdAt.toISOString()}>{displayTime(row.createdAt)}</time></td>
                <td><span className="flex min-w-40 items-center gap-2"><Avatar name={row.actor.name} />{row.actor.name}</span></td><td><Badge tone="muted">{row.action}</Badge></td>
                <td>{href ? <Link className="text-link" href={href}>{row.entity} {row.entityId}</Link> : row.entity + " " + row.entityId}</td></tr>;
            })}</tbody>
          </table>
        </div> : <EmptyState title="No audit events match these filters." />}
        <ListPagination path="/audit" query={{ q }} page={page} pages={pages} total={total} label="events" />
      </section>
    </>
  );
}
