import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { CategoryDistribution } from "@/components/InventoryCharts";
import { ListFilters, ListPagination } from "@/components/ListControls";
import SectionTitle from "@/components/SectionTitle";
import StatCard from "@/components/StatCard";
import { AssetStatus, EmptyState } from "@/components/WorkspaceUI";
import { database } from "@/lib/db";
import { statusLabels } from "@/lib/display";
import { listHref, pageFor } from "@/lib/list-query";
import { parseReport, reportColumns, reportOptions, reportSource } from "@/lib/reports";
import { requireUser } from "@/lib/session";

export const instant = false;

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  await requireUser();
  const query = parseReport(await searchParams);
  const db = database();
  const source = reportSource(db, query);
  const [categories, locations, total] = await Promise.all([
    db.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.location.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    source.count(),
  ]);
  const { page, pages, skip, take } = pageFor(total, query.page);
  const rows = await source.rows(skip, take);
  const cols = reportColumns(query);
  const grouped = query.report === "categories" || query.report === "locations";
  const breakdown = grouped ? rows.map(([name, count]) => ({ label: String(name), count: Number(count) })) : [];
  const reportName = reportOptions.find(item => item.value === query.report)?.label ?? "Report";
  const options = (items: { id: string; name: string }[]) => [{ value: "", label: "All" },
    ...items.map(({ id, name }) => ({ value: id, label: name }))];
  return (
    <>
      <SectionTitle title="Reports" description="Review inventory and assignments, then export the filtered results.">
        <Link className="button primary" prefetch={false} href={listHref("/api/reports/export", { ...query, page: 1 })} download><Download aria-hidden="true" /> Export CSV</Link>
      </SectionTitle>
      <ListFilters path="/reports" q={query.q} filters={[
        { name: "report", label: "Report", value: query.report, options: [...reportOptions] },
        { name: "category", label: "Category", value: query.category, options: options(categories) },
        { name: "location", label: "Location", value: query.location, options: options(locations) },
      ]} />
      <div className="oa-chart-grid mb-5 items-start">
        <StatCard title={reportName + " · matching records"} value={total} color="accent" icon={FileText} />
        {!!breakdown.length && <CategoryDistribution title="Asset counts on this page" rows={breakdown} total={breakdown.reduce((sum, row) => sum + row.count, 0)} />}
      </div>
      <section className="panel">
        <h2 className="mb-3 text-xl font-semibold">{reportName}</h2>
        {rows.length ? <div className="table-wrap" tabIndex={0} role="region" aria-label="Report results">
          <table>
            <thead><tr>{cols.map(col => <th key={col} scope="col">{col}</th>)}</tr></thead>
            <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, index) => {
              const status = cols[index] === "Status" && (Object.keys(statusLabels) as (keyof typeof statusLabels)[]).find(key => statusLabels[key] === cell);
              return <td key={index}>{status ? <AssetStatus status={status} /> : cell ?? "—"}</td>;
            })}</tr>)}</tbody>
          </table>
        </div> : <EmptyState title="No records match these filters." detail="Choose another report or adjust the filters." />}
        <ListPagination path="/reports" query={query} page={page} pages={pages} total={total} label="records" />
      </section>
    </>
  );
}
