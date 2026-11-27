import Link from "next/link";
import { PackagePlus } from "lucide-react";
import InventoryList from "@/components/InventoryList";
import SectionTitle from "@/components/SectionTitle";
import { parseAssetQuery } from "@/lib/asset-search";
import { requireUser } from "@/lib/session";

export const instant = false;

export default async function AssetsPage({ searchParams }: PageProps<"/assets">) {
  const user = await requireUser();
  const query = parseAssetQuery(await searchParams);
  return (
    <>
      <SectionTitle title="Assets" description="Search and manage equipment across your locations.">
        {user.role === "admin" && <Link href="/assets/new" className="button primary"><PackagePlus aria-hidden="true" />Register asset</Link>}
      </SectionTitle>
      <InventoryList query={query} path="/assets" />
    </>
  );
}
