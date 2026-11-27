import { Box, HardDrive, Laptop, Monitor, Network, PackageOpen, type LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { statusLabels } from "@/lib/display";

const assetTones = { AVAILABLE: "green", ISSUED: "blue", MAINTENANCE: "amber", ARCHIVED: "muted" } as const;

export function Avatar({ name }: { name: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join("").toUpperCase();
  return <span className="oa-avatar" aria-hidden="true">{initials || "?"}</span>;
}

export function Badge({ children, tone = "accent" }: { children: ReactNode; tone?: "accent" | "muted" | "green" | "blue" | "amber" | "red" }) {
  return <span className="oa-badge" style={{ "--badge-color": "var(--oa-" + tone + ")" } as CSSProperties}><span className="oa-dot" aria-hidden="true" />{children}</span>;
}

export function AssetStatus({ status }: { status: keyof typeof statusLabels }) {
  return <Badge tone={assetTones[status]}>{statusLabels[status]}</Badge>;
}

export function AssetIcon({ category }: { category: string }) {
  const name = category.toLowerCase();
  const Icon = /computer|laptop|desktop/.test(name) ? Laptop : /display|monitor/.test(name) ? Monitor : /network/.test(name) ? Network :
    /accessor|storage/.test(name) ? HardDrive : Box;
  return <span className="oa-asset-mark" aria-hidden="true"><Icon size={19} /></span>;
}

export function EmptyState({ title, detail, Icon = PackageOpen }: { title: string; detail?: string; Icon?: LucideIcon }) {
  return <div className="oa-empty"><span className="oa-asset-mark"><Icon aria-hidden="true" /></span>
    <p className="font-semibold text-foreground">{title}</p>
    {detail && <p className="text-sm">{detail}</p>}
  </div>;
}
