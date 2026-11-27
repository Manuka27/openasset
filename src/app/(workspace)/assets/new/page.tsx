import Link from "next/link";
import SectionTitle from "@/components/SectionTitle";
import { requireAdmin } from "@/lib/session";
import AssetForm from "../asset-form";

export const instant = false;

export default async function CreateAssetPage() {
  await requireAdmin();
  return (
    <>
      <SectionTitle title="Register asset" description="Add equipment, its identifiers, and warranty details."><Link className="button" href="/assets">Back to assets</Link></SectionTitle>
      <div className="panel max-w-2xl"><AssetForm /></div>
    </>
  );
}
