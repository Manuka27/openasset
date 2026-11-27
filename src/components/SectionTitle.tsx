import type { ReactNode } from "react";

export default function SectionTitle({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-7">
      <div className="min-w-0">
        <h1 className="oa-page-title break-words">{title}</h1>
        {description && <p className="oa-muted mt-1.5 max-w-2xl text-sm">{description}</p>}
      </div>
      {children}
    </header>
  );
}
