import type { CSSProperties } from "react";

type Row = { label: string; count: number; color?: string };

function percentage(count: number, total: number) {
  return total === 0 ? 0 : count / total * 100;
}

export function StatusDistribution({ rows, total }: { rows: Row[]; total: number }) {
  let offset = 0;
  const slices: string[] = [];
  for (const row of rows) {
    if (!row.count) continue;
    const start = offset;
    offset += percentage(row.count, total);
    slices.push(row.color + " " + start + "% " + offset + "%");
  }
  const background = slices.length ? "conic-gradient(" + slices.join(", ") + ")" : "var(--oa-elevated)";
  return <section className="panel" aria-labelledby="status-distribution">
    <h2 className="mb-4 text-lg font-semibold" id="status-distribution">Status distribution</h2>
    <div className="grid items-center gap-5 sm:grid-cols-[minmax(0,.8fr)_minmax(0,1fr)]">
      <div className="oa-donut" style={{ background }} aria-hidden="true">
        <div className="oa-donut-inner"><strong className="text-2xl font-semibold">{total}</strong><span className="oa-muted text-xs">Total assets</span></div>
      </div>
      <ul className="divide-y divide-slate-700">
        {rows.map(row => <li key={row.label} className="flex items-center justify-between gap-2 py-2.5 text-sm"
          title={percentage(row.count, total).toFixed(1) + "% of inventory"}>
          <span className="flex items-center gap-2"><span className="oa-dot" style={{ color: row.color }} aria-hidden="true" />{row.label}</span>
          <strong className="tabular-nums">{row.count}</strong>
        </li>)}
      </ul>
    </div>
  </section>;
}

export function CategoryDistribution({ rows, total, title = "Category distribution" }: { rows: Row[]; total: number; title?: string }) {
  return <section className="panel" aria-label={title}>
    <h2 className="mb-4 text-lg font-semibold">{title}</h2>
    {rows.length ? <ul className="space-y-4">{rows.map(row => (
      <li key={row.label} title={percentage(row.count, total).toFixed(1) + "% of inventory"}>
        <div className="mb-1.5 flex justify-between gap-3 text-sm"><span>{row.label}</span><strong className="tabular-nums">{row.count}</strong></div>
        <div className="oa-track" aria-hidden="true"><div style={{ width: percentage(row.count, total) + "%", "--bar-color": row.color } as CSSProperties} /></div>
      </li>
    ))}</ul> : <p className="oa-muted">No assets recorded.</p>}
  </section>;
}
