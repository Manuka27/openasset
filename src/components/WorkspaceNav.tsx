"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, ArrowLeftRight, ClipboardList, FileBarChart2, LayoutDashboard, MapPin, Package, UserCircle, Users, UserRoundCog } from "lucide-react";

const groups = [
  { label: "Workspace", links: [
    { label: "Dashboard", href: "/dashboard", Icon: LayoutDashboard },
    { label: "Assets", href: "/assets", Icon: Package },
    { label: "Assignments", href: "/assignments", Icon: ArrowLeftRight },
    { label: "Reports", href: "/reports", Icon: FileBarChart2 },
  ] },
  { label: "Administration", admin: true, links: [
    { label: "Categories", href: "/directory/categories", Icon: Archive },
    { label: "Locations", href: "/directory/locations", Icon: MapPin },
    { label: "Employees", href: "/employees", Icon: Users },
    { label: "Users", href: "/users", Icon: UserRoundCog },
    { label: "Audit log", href: "/audit", Icon: ClipboardList },
  ] },
  { label: "Account", links: [{ label: "Profile", href: "/profile", Icon: UserCircle }] },
];

const matches = (path: string, href: string) => path === href || path.startsWith(href + "/");

export function currentPage(path: string) {
  if (path === "/assets/new") return { label: "Register asset", parent: { href: "/assets", label: "Assets" } };
  if (path.startsWith("/assets/")) return { label: "Asset details", parent: { href: "/assets", label: "Assets" } };
  if (path.startsWith("/employees/")) return { label: "Employee details", parent: { href: "/employees", label: "Employees" } };
  const link = groups.flatMap(group => group.links).find(link => matches(path, link.href));
  return { label: link?.label ?? "Workspace" };
}

export default function WorkspaceNav({ admin, onNavigate }: { admin: boolean; onNavigate?: () => void }) {
  const path = usePathname();
  return <nav aria-label="Main navigation">
    {groups.filter(group => !group.admin || admin).map(group => (
      <div key={group.label} className="oa-nav-group">
        <span className="oa-nav-label">{group.label}</span>
        {group.links.map(({ label, href, Icon }) => (
          <Link key={href} href={href} onClick={onNavigate} className="oa-nav-link" title={label} aria-label={label}
            aria-current={matches(path, href) ? "page" : undefined}>
            <Icon aria-hidden="true" /><span className="oa-nav-text">{label}</span>
          </Link>
        ))}
      </div>
    ))}
  </nav>;
}
