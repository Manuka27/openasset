import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import { ListFilters, ListPagination } from "@/components/ListControls";
import SectionTitle from "@/components/SectionTitle";
import { Avatar, Badge, EmptyState } from "@/components/WorkspaceUI";
import { assignmentEmployeesQuery, assignmentLinks, assignmentStates, assignmentWhere, parseAssignments, returnConditionLabels, utcToday } from "@/lib/assignment-search";
import { database } from "@/lib/db";
import { displayDay, displayTime } from "@/lib/display";
import { pageFor } from "@/lib/list-query";
import { requireUser } from "@/lib/session";
import { issueAction, returnAction } from "../actions";

export const instant = false;

export default async function AssignmentsPage({ searchParams }: PageProps<"/assignments">) {
  await requireUser();
  const query = parseAssignments(await searchParams);
  const today = utcToday();
  const where = assignmentWhere(query, today);
  const db = database();
  const [assets, employees, total] = await Promise.all([
    db.asset.findMany({
      where: { status: "AVAILABLE", assignments: { none: { returnedAt: null } } },
      select: { id: true, tag: true, name: true }, orderBy: { tag: "asc" },
    }),
    db.employee.findMany(assignmentEmployeesQuery),
    db.assignment.count({ where }),
  ]);
  const { page, pages, skip, take } = pageFor(total, query.page);
  const rows = await db.assignment.findMany({
    where, include: assignmentLinks, orderBy: [{ issuedAt: "desc" }, { id: "asc" }], skip, take,
  });
  return (
    <>
      <SectionTitle title="Assignments" description="Issue equipment, record returns, and review overdue items." />
      <section id="issue" className="panel mb-5 scroll-mt-24">
        <h2 className="mb-4 text-xl font-semibold">Issue an asset</h2>
        {assets.length && employees.length ? (
          <ActionForm action={issueAction} submit="Issue asset" resetOnSuccess fields={[
            { name: "assetId", label: "Available asset", type: "select", required: true,
              value: query.asset, options: assets.map(asset => ({ value: asset.id, label: asset.tag + " · " + asset.name })) },
            { name: "employeeId", label: "Employee", type: "select", required: true,
              options: employees.map(employee => ({ value: employee.id, label: employee.name + " · " + employee.location.name })) },
            { name: "expectedReturnDate", label: "Expected return date (UTC)", type: "date" },
          ]} />
        ) : <EmptyState title="Issuing is unavailable" detail="An available asset and an active employee are required." />}
      </section>
      <ListFilters path="/assignments" q={query.q} searchLabel="Search assets or employees" hidden={query.asset ? { asset: query.asset } : undefined}
        filters={[{ name: "state", label: "Assignment status", value: query.state, options: [...assignmentStates] }]} />
      {query.asset && <p className="mb-4 flex gap-3">Showing history for one asset. <Link className="text-link" href="/assignments?state=all">Show all assets</Link></p>}
      <section className="panel" aria-label="Assignment history">
        {rows.length ? <div className="table-wrap" tabIndex={0} role="region" aria-label="Assignments">
          <table>
            <thead><tr><th scope="col">Asset</th><th scope="col">Employee</th><th scope="col">Issued</th><th scope="col">Due</th><th scope="col">Return</th></tr></thead>
            <tbody>{rows.map(row => <tr key={row.id}>
              <td><Link className="text-link" href={"/assets/" + row.asset.id}>{row.asset.tag} · {row.asset.name}</Link></td>
              <td><div className="flex min-w-40 items-center gap-2"><Avatar name={row.employee.name} /><div>{row.employee.name}<div className="oa-muted text-xs">{row.location.name}</div></div></div></td>
              <td>{displayTime(row.issuedAt)}<br />{row.issuedBy.name}</td>
              <td>{displayDay(row.expectedReturnDate)}{!row.returnedAt && row.expectedReturnDate && row.expectedReturnDate < today && <div className="mt-1"><Badge tone="amber">Overdue</Badge></div>}</td>
              <td className="min-w-52">
                {row.returnedAt ? <>
                  <Badge tone="green">Returned</Badge><p className="oa-muted mt-1 text-xs">{displayTime(row.returnedAt)} · {row.returnedBy?.name}</p>
                  {row.returnCondition && <p>{returnConditionLabels[row.returnCondition]}</p>}
                  {row.returnNotes && <p className="whitespace-pre-wrap break-words">{row.returnNotes}</p>}
                </> : <details>
                  <summary className="text-link cursor-pointer">Record return</summary>
                  <div className="mt-3">
                    <ActionForm action={returnAction.bind(null, row.id)} submit="Return asset"
                      confirm={{ title: "Return this asset?", detail: "Assets marked damaged or in need of service will move to maintenance." }}
                      fields={[
                        { name: "returnCondition", label: "Return condition", type: "select", required: true,
                          options: Object.entries(returnConditionLabels).map(([value, label]) => ({ value, label })) },
                        { name: "returnNotes", label: "Return notes", type: "textarea", maxLength: 2000 },
                      ]} />
                  </div>
                </details>}
              </td>
            </tr>)}</tbody>
          </table>
        </div> : <EmptyState title="No assignments match these filters." />}
        <ListPagination path="/assignments" query={query} page={page} pages={pages} total={total} label="assignments" />
      </section>
    </>
  );
}
