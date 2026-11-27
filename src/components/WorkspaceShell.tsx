"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, Menu, PanelLeftClose, PanelLeftOpen, Search, UserRound, X } from "lucide-react";
import { useRef, type ReactNode } from "react";
import Brand from "./Brand";
import SignOut from "./SignOut";
import { Avatar } from "./WorkspaceUI";
import WorkspaceNav, { currentPage } from "./WorkspaceNav";
import { ThemeToggle, usePreference } from "./WorkspacePreferences";

export default function WorkspaceShell({ user, children }: {
  user: { name: string; role: string; admin: boolean }; children: ReactNode;
}) {
  const location = usePathname();
  const page = currentPage(location);
  const [collapsed, setCollapsed] = usePreference("openasset.sidebar", "expanded");
  const compact = collapsed === "collapsed";
  const drawer = useRef<HTMLDialogElement>(null);
  const account = useRef<HTMLDetailsElement>(null);
  const collapseLabel = compact ? "Expand sidebar" : "Collapse sidebar";

  return (
    <div className="oa-shell" data-collapsed={compact}>
      <a href="#workspace-main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-slate-900 focus:p-3">Skip to content</a>
      <aside className="oa-sidebar" aria-label="Sidebar">
        <div className="mb-7 px-1"><Brand /></div>
        <WorkspaceNav admin={user.admin} />
      </aside>
      <dialog ref={drawer} className="oa-drawer" aria-label="Navigation"
        onClick={event => { if (event.target === event.currentTarget) drawer.current?.close(); }}>
        <div className="mb-6 flex items-center justify-between gap-3">
          <Brand />
          <button type="button" className="button oa-icon-button" aria-label="Close navigation" onClick={() => drawer.current?.close()}><X aria-hidden="true" /></button>
        </div>
        <WorkspaceNav admin={user.admin} onNavigate={() => drawer.current?.close()} />
      </dialog>
      <div className="oa-content">
        <header className="oa-topbar">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button type="button" className="button oa-icon-button oa-mobile-toggle" aria-label="Open navigation" onClick={() => drawer.current?.showModal()}><Menu aria-hidden="true" /></button>
            <button type="button" className="button oa-icon-button oa-desktop-toggle" aria-label={collapseLabel} title={collapseLabel} onClick={() => setCollapsed(compact ? "expanded" : "collapsed")}>{compact ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}</button>
            {page.parent && <><Link href={page.parent.href} className="text-link hidden text-sm sm:inline">{page.parent.label}</Link><ChevronRight size={14} className="oa-muted hidden shrink-0 sm:block" aria-hidden="true" /></>}
            <span className="oa-header-label">{page.label}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <form action="/assets" method="get" role="search" className="oa-search">
              <input name="q" type="search" aria-label="Search inventory" placeholder="Search inventory…" maxLength={120} />
              <button className="button oa-icon-button" aria-label="Find assets" title="Find assets"><Search aria-hidden="true" /></button>
            </form>
            <Link href="/assets" className="button oa-icon-button oa-mobile-search" aria-label="Search inventory" title="Search inventory"><Search aria-hidden="true" /></Link>
            <ThemeToggle />
            <details ref={account} className="relative" onKeyDown={event => {
              if (event.key === "Escape" && account.current?.open) {
                account.current.open = false;
                account.current.querySelector("summary")?.focus();
              }
            }}>
              <summary className="button cursor-pointer list-none px-2" aria-label="Account menu">
                <Avatar name={user.name} />
                <span className="hidden text-left sm:block"><span className="block max-w-32 truncate text-sm">{user.name}</span><span className="oa-muted block text-xs">{user.role}</span></span>
                <ChevronDown aria-hidden="true" />
              </summary>
              <div className="panel oa-profile-panel">
                <Link href="/profile" className="oa-nav-link" onClick={() => { if (account.current) account.current.open = false; }}><UserRound aria-hidden="true" /> Profile settings</Link>
                <SignOut compact />
              </div>
            </details>
          </div>
        </header>
        <main id="workspace-main" tabIndex={-1} className="oa-main">{children}</main>
      </div>
    </div>
  );
}
