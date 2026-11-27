import Link from "next/link";
import { notFound } from "next/navigation";
import ActionForm from "@/components/ActionForm";
import SectionTitle from "@/components/SectionTitle";
import { AssetIcon, AssetStatus, Badge, EmptyState } from "@/components/WorkspaceUI";
import { database } from "@/lib/db";
import { displayDay, displayTime, statusLabels } from "@/lib/display";
import { requireUser } from "@/lib/session";
import { archiveAssetAction } from "../../actions";
import AssetForm from "../asset-form";

export const instant = false;

export default async function AssetPage({ params }: PageProps<"/assets/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const db = database();
  const asset = await db.asset.findUnique({
    where: { id }, include: { category: true, location: true },
  });
  if (!asset) notFound();
  const assignments = await db.assignment.findMany({
    where: { assetId: id }, orderBy: { issuedAt: "desc" }, take: 10,
    select: { id: true, issuedAt: true, returnedAt: true, employee: { select: { name: true } }, location: { select: { name: true } } },
  });
  const fields = [
    ["Asset ID", asset.tag], ["Status", statusLabels[asset.status]], ["Category", asset.category.name],
    ["Home location", asset.location.name], ["Brand", asset.brand], ["Model", asset.model],
    ["Serial number", asset.serialNumber], ["Purchase date", displayDay(asset.purchaseDate)],
    ["Purchase cost", asset.purchaseCost?.toFixed(2)], ["Warranty expiry", displayDay(asset.warrantyExpiry)], ["Notes", asset.notes],
  ];
  return (
    <>
      <SectionTitle title={asset.name} description={asset.tag + " · " + asset.category.name}>
        <div className="flex flex-wrap items-center gap-3"><AssetIcon category={asset.category.name} /><AssetStatus status={asset.status} /><Link className="button" href="/assets">Back to assets</Link></div>
      </SectionTitle>
      <div className="grid gap-5">
        <dl className="panel grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {fields.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-sm text-slate-300">{label}</dt><dd className="whitespace-pre-wrap break-words">{value ?? "—"}</dd></div>)}
        </dl>
        <section className="panel">
          <h2 className="mb-3 text-xl font-semibold">Recent assignment history</h2>
          {assignments.length ? <ul className="space-y-2">{assignments.map(item => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 py-2.5">
              <div className="text-sm">{item.employee.name} · {item.location.name}<p className="oa-muted text-xs">{displayTime(item.issuedAt)}{item.returnedAt ? " → " + displayTime(item.returnedAt) : ""}</p></div>
              <Badge tone={item.returnedAt ? "green" : "blue"}>{item.returnedAt ? "Returned" : "Open"}</Badge>
            </li>
          ))}</ul> : <EmptyState title="This asset has no assignments." />}
          <Link href={"/assignments?asset=" + id} className="text-link mt-3 inline-block">View all assignments for this asset</Link>
        </section>
        {user.role === "admin" && asset.status !== "ARCHIVED" && (
          <section className="panel max-w-2xl">
            <h2 className="mb-4 text-xl font-semibold">Edit asset</h2>
            <AssetForm asset={asset} />
            {asset.status !== "ISSUED" && <div className="mt-6 border-t border-slate-700 pt-4">
              <ActionForm action={archiveAssetAction.bind(null, id)} submit="Archive asset"
                confirm={{ title: "Archive this asset?", detail: "The asset will leave active inventory. Its details and assignment history will remain available." }} />
            </div>}
          </section>
        )}
      </div>
    </>
  );
}
