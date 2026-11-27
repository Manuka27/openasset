import ActionForm, { type Field } from "@/components/ActionForm";
import { database } from "@/lib/db";
import type { Asset } from "@/generated/prisma/client";
import { saveAssetAction } from "../actions";

export default async function AssetForm({ asset }: { asset?: Asset }) {
  const db = database();
  const [categories, locations] = await Promise.all([
    db.category.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }),
    db.location.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }),
  ]);
  if (!categories.length || !locations.length) return <p>Add an active category and location before registering assets.</p>;
  const options = (records: { id: string; name: string }[]) => records.map(record => ({ value: record.id, label: record.name }));
  const fields: Field[] = [
    { name: "tag", label: "Asset ID", value: asset?.tag, required: true, maxLength: 48 },
    { name: "name", label: "Asset name", value: asset?.name, required: true, maxLength: 120 },
    { name: "categoryId", label: "Category", type: "select", value: asset?.categoryId, required: true, options: options(categories) },
    { name: "locationId", label: "Home location", type: "select", value: asset?.locationId, required: true, options: options(locations) },
    { name: "status", label: "Inventory condition", type: "select", value: asset?.status === "MAINTENANCE" ? "MAINTENANCE" : "AVAILABLE", required: true,
      options: [{ value: "AVAILABLE", label: "Available" }, { value: "MAINTENANCE", label: "Maintenance" }] },
    { name: "brand", label: "Brand", value: asset?.brand ?? "", maxLength: 80 },
    { name: "model", label: "Model", value: asset?.model ?? "", maxLength: 80 },
    { name: "serialNumber", label: "Serial number", value: asset?.serialNumber ?? "", maxLength: 120 },
    { name: "purchaseDate", label: "Purchase date", type: "date", value: asset?.purchaseDate?.toISOString().slice(0, 10) },
    { name: "purchaseCost", label: "Purchase cost", type: "decimal", value: asset?.purchaseCost?.toFixed(2) },
    { name: "warrantyExpiry", label: "Warranty expiry", type: "date", value: asset?.warrantyExpiry?.toISOString().slice(0, 10) },
    { name: "notes", label: "Notes", type: "textarea", value: asset?.notes ?? "", maxLength: 2000 },
  ];
  return (
    <>
      {asset?.status === "ISSUED" && <p className="mb-4 text-slate-300">This asset stays issued until it is returned. Return it before changing its home location or placing it in maintenance.</p>}
      <ActionForm action={saveAssetAction.bind(null, asset?.id ?? null)} fields={fields} submit={asset ? "Save changes" : "Register asset"} />
    </>
  );
}
