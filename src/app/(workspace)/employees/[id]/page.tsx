import Link from "next/link";
import { notFound } from "next/navigation";
import ActionForm from "@/components/ActionForm";
import { ListPagination } from "@/components/ListControls";
import SectionTitle from "@/components/SectionTitle";
import { Badge, EmptyState } from "@/components/WorkspaceUI";
import { assignmentLinks, returnConditionLabels } from "@/lib/assignment-search";
import { database } from "@/lib/db";
import { displayDay, displayTime } from "@/lib/display";
import { pageFor, queryPage } from "@/lib/list-query";
import { requireAdmin } from "@/lib/session";
import { archiveEmployeeAction } from "../../actions";
import EmployeeForm from "../employee-form";

export const instant = false;

export default async function EmployeePage({ params, searchParams }: PageProps<"/employees/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const input = await searchParams;
  const db = database();
  const employee = await db.employee.findUnique({ where: { id }, include: { location: { select: { name: true } } } });
  if (!employee) notFound();
  const where = { employeeId: id };
  const [locations, total, active] = await Promise.all([
    employee.archivedAt ? [] : db.location.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }),
    db.assignment.count({ where }),
    db.assignment.findMany({ where: { ...where, returnedAt: null }, select: { id: true, asset: assignmentLinks.asset }, orderBy: { issuedAt: "desc" } }),
  ]);
  const { page, pages, skip, take } = pageFor(total, queryPage(input.page));
  const rows = await db.assignment.findMany({ where, include: assignmentLinks, orderBy: [{ issuedAt: "desc" }, { id: "asc" }], skip, take });
  return (
    <>
      <SectionTitle title={employee.name} description={employee.department ?? employee.location.name}>
        <div className="flex items-center gap-3"><Badge tone={employee.archivedAt ? "muted" : "green"}>{employee.archivedAt ? "Archived" : "Active"}</Badge><Link href="/employees" className="button">Back to employees</Link></div>
      </SectionTitle>
      <dl className="panel mb-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {[["Employee ID", employee.employeeNumber ?? employee.id], ["Email", employee.email], ["Department", employee.department ?? "—"],
          ["Location", employee.location.name], ["Status", employee.archivedAt ? "Archived" : "Active"]].map(([label, value]) =>
          <div key={label}><dt className="text-sm text-slate-300">{label}</dt><dd className="break-words">{value}</dd></div>)}
      </dl>
      <section className="panel mb-5">
        <h2 className="mb-3 text-xl font-semibold">Currently assigned assets</h2>
        {active.length ? <ul className="space-y-2">{active.map(row => <li key={row.id}><Link className="text-link" href={"/assets/" + row.asset.id}>{row.asset.tag} · {row.asset.name}</Link></li>)}</ul> : <EmptyState title="No assets are currently assigned." />}
      </section>
      <section className="panel mb-5">
        <h2 className="mb-3 text-xl font-semibold">Assignment and return history</h2>
        {rows.length ? <div className="table-wrap" tabIndex={0} role="region" aria-label="Employee assignment history">
          <table>
            <thead><tr><th scope="col">Asset</th><th scope="col">Issued</th><th scope="col">Due</th><th scope="col">Returned</th><th scope="col">Condition</th></tr></thead>
            <tbody>{rows.map(row => <tr key={row.id}>
              <td><Link className="text-link" href={"/assets/" + row.asset.id}>{row.asset.tag} · {row.asset.name}</Link></td>
              <td>{displayTime(row.issuedAt)}<br />{row.issuedBy.name}</td><td>{displayDay(row.expectedReturnDate)}</td>
              <td>{row.returnedAt ? displayTime(row.returnedAt) : "Open"}<br />{row.returnedBy?.name}</td>
              <td>{row.returnCondition ? returnConditionLabels[row.returnCondition] : "—"}{row.returnNotes && <p>{row.returnNotes}</p>}</td>
            </tr>)}</tbody>
          </table>
        </div> : <EmptyState title="No assignment history." />}
        <ListPagination path={"/employees/" + id} query={{}} page={page} pages={pages} total={total} label="assignments" />
      </section>
      {!employee.archivedAt && <section className="panel max-w-2xl">
        <h2 className="mb-4 text-xl font-semibold">Edit employee</h2>
        <EmployeeForm employee={employee} locations={locations} />
        {active.length === 0 && <div className="mt-5 border-t border-slate-700 pt-4">
          <ActionForm action={archiveEmployeeAction.bind(null, id)} submit="Archive employee"
            confirm={{ title: "Archive this employee?", detail: "The employee’s assignment history remains available." }} />
        </div>}
      </section>}
    </>
  );
}
