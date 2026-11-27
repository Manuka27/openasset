import Link from "next/link";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Box, CheckCircle2, ClipboardList, MapPin, PackagePlus, Archive, Wrench } from "lucide-react";
import { CategoryDistribution, StatusDistribution } from "@/components/InventoryCharts";
import SectionTitle from "@/components/SectionTitle";
import StatCard from "@/components/StatCard";
import { AssetIcon, EmptyState } from "@/components/WorkspaceUI";
import { database } from "@/lib/db";
import { displayTime, statusLabels } from "@/lib/display";
import { requireUser } from "@/lib/session";

export const instant = false;

const statusColors = { AVAILABLE: "var(--oa-green)", ISSUED: "var(--oa-blue)", MAINTENANCE: "var(--oa-amber)", ARCHIVED: "var(--oa-muted)" };
const recentFields = {
  id: true, issuedAt: true, returnedAt: true,
  asset: { select: { id: true, tag: true, name: true, category: { select: { name: true } } } },
  employee: { select: { name: true } },
};

function RecentAssignments({ rows, returned }: {
  rows: { id: string; issuedAt: Date; returnedAt: Date | null; asset: { id: string; tag: string; name: string; category: { name: string } }; employee: { name: string } }[];
  returned?: boolean;
}) {
  const Icon = returned ? ArrowDownLeft : ArrowUpRight;
  return <section className="panel">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><Icon size={17} aria-hidden="true" />{returned ? "Recent returns" : "Recent assignments"}</h2>
      <Link className="text-link text-sm" href={returned ? "/assignments?state=returned" : "/assignments?state=all"}>View history</Link>
    </div>
    {rows.length ? <ul className="divide-y divide-slate-700">{rows.map(row => <li key={row.id} className="flex items-start gap-3 py-3">
      <AssetIcon category={row.asset.category.name} />
      <div className="min-w-0">
        <Link className="text-link break-words text-sm" href={"/assets/" + row.asset.id}>{row.asset.name}</Link>
        <p className="oa-muted break-words text-xs">{row.asset.tag} · {row.employee.name}</p>
        <p className="oa-muted mt-1 text-xs">{displayTime(returned ? row.returnedAt : row.issuedAt)}</p>
      </div>
    </li>)}</ul> : <EmptyState title={returned ? "No returns yet" : "No assignments yet"} />}
  </section>;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const db = database();
  const [assetCounts, activeLocations, categories, assignments, returns, activity] = await Promise.all([
    db.asset.groupBy({ by: ["status"], _count: { _all: true } }),
    db.location.count({ where: { archivedAt: null } }),
    db.category.findMany({ where: { assets: { some: {} } }, select: { name: true, _count: { select: { assets: true } } }, orderBy: { name: "asc" } }),
    db.assignment.findMany({ select: recentFields, orderBy: [{ issuedAt: "desc" }, { id: "asc" }], take: 5 }),
    db.assignment.findMany({ where: { returnedAt: { not: null } }, select: recentFields, orderBy: [{ returnedAt: "desc" }, { id: "asc" }], take: 5 }),
    db.auditLog.findMany({ where: { entity: { in: ["Asset", "Assignment", "category", "location"] } },
      select: { id: true, action: true, entity: true, entityId: true, createdAt: true, actor: { select: { name: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: 6 }),
  ]);
  const counts = new Map(assetCounts.map(({ status, _count }) => [status, _count._all]));
  const total = assetCounts.reduce((sum, row) => sum + row._count._all, 0);

  return (
    <>
      <SectionTitle title="Dashboard" description="Inventory counts, equipment movement, and recent activity.">
        <Link href="/assets?status=ALL" className="button primary">View inventory <ArrowRight aria-hidden="true" /></Link>
      </SectionTitle>
      <div className="oa-metrics mb-4">
        <StatCard title="Total assets" value={total} color="accent" icon={Box} href="/assets?status=ALL" />
        <StatCard title="Available" value={counts.get("AVAILABLE") ?? 0} color="green" icon={CheckCircle2} href="/assets?status=AVAILABLE" />
        <StatCard title="Issued" value={counts.get("ISSUED") ?? 0} color="blue" icon={ArrowUpRight} href="/assets?status=ISSUED" />
        <StatCard title="Maintenance" value={counts.get("MAINTENANCE") ?? 0} color="amber" icon={Wrench} href="/assets?status=MAINTENANCE" />
        <StatCard title="Archived" value={counts.get("ARCHIVED") ?? 0} color="muted" icon={Archive} href="/assets?status=ARCHIVED" />
        <StatCard title="Active locations" value={activeLocations} color="cyan" icon={MapPin} href={user.role === "admin" ? "/directory/locations" : "/reports?report=locations"} />
      </div>
      <div className="oa-chart-grid mb-4">
        <StatusDistribution total={total} rows={Object.entries(statusLabels).map(([status, label]) => {
          const key = status as keyof typeof statusLabels;
          return { label, count: counts.get(key) ?? 0, color: statusColors[key] };
        })} />
        <CategoryDistribution total={total} rows={categories.map(row => ({ label: row.name, count: row._count.assets }))} />
      </div>
      <section className="panel mb-4 flex flex-wrap items-center justify-between gap-3" aria-label="Quick actions">
        <h2 className="text-lg font-semibold">Quick actions</h2>
        <div className="flex flex-wrap gap-2">
          {user.role === "admin" && <Link href="/assets/new" className="button"><PackagePlus aria-hidden="true" /> Register asset</Link>}
          <Link href="/assignments#issue" className="button"><ArrowUpRight aria-hidden="true" /> Issue equipment</Link>
          <Link href="/reports" className="button"><ClipboardList aria-hidden="true" /> Open reports</Link>
        </div>
      </section>
      <div className="oa-chart-grid mb-4">
        <RecentAssignments rows={assignments} />
        <RecentAssignments rows={returns} returned />
      </div>
      <section className="panel">
        <div className="mb-3 flex flex-wrap justify-between gap-2">
          <h2 className="text-lg font-semibold">Recent inventory activity</h2>
          {user.role === "admin" && <Link href="/audit" className="text-link text-sm">View audit log</Link>}
        </div>
        {activity.length ? <ul className="divide-y divide-slate-700">{activity.map(event => <li key={event.id} className="flex flex-wrap justify-between gap-2 py-3">
          <div className="text-sm">{event.entity === "Asset" ? <Link className="text-link" href={"/assets/" + event.entityId}>{event.action}</Link> : event.action}
            <p className="oa-muted text-xs">{event.actor.name}</p>
          </div>
          <time dateTime={event.createdAt.toISOString()} className="oa-muted text-xs">{displayTime(event.createdAt)}</time>
        </li>)}</ul> : <EmptyState title="No inventory activity yet" detail="New inventory changes will appear here." />}
      </section>
    </>
  );
}
