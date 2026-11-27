import { Suspense, type ReactNode } from "react";
import WorkspaceShell from "@/components/WorkspaceShell";
import { roleLabels } from "@/lib/display";
import { requireUser } from "@/lib/session";
import Loading from "./loading";

async function Workspace({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return <WorkspaceShell user={{ name: user.name, role: roleLabels[user.role], admin: user.role === "admin" }}>{children}</WorkspaceShell>;
}

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="oa-main w-full"><Loading /></div>}><Workspace>{children}</Workspace></Suspense>;
}
