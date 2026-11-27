import type { LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import Link from "next/link";

type Tone = "cyan" | "amber" | "green" | "muted" | "blue" | "accent";

const tones: Record<Tone, string> = {
  cyan: "var(--oa-accent)", amber: "var(--oa-amber)", green: "var(--oa-green)",
  muted: "var(--oa-muted)", blue: "var(--oa-blue)", accent: "var(--oa-accent)",
};

export default function StatCard({ title, value, color, icon: Icon, href }: {
  title: string; value: number; color: Tone; icon?: LucideIcon; href?: string;
}) {
  const content = <>
    {Icon && <span className="oa-metric-icon"><Icon size={16} aria-hidden="true" /></span>}
    <p className="oa-metric-value">{value.toLocaleString("en-US")}</p>
    <p className="oa-muted mt-1 text-xs font-semibold sm:text-sm">{title}</p>
  </>;
  const style = { "--tint": tones[color] } as CSSProperties;
  return href
    ? <Link href={href} className="panel oa-metric block hover:border-current" style={style}>{content}</Link>
    : <div className="panel oa-metric" style={style}>{content}</div>;
}
