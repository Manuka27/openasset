import Link from "next/link";
import { ListFilters, ListPagination } from "@/components/ListControls";
import SectionTitle from "@/components/SectionTitle";
import { Avatar, Badge, EmptyState } from "@/components/WorkspaceUI";
import type { Prisma } from "@/generated/prisma/client";
import { database } from "@/lib/db";
import { pageFor, queryPage, queryText } from "@/lib/list-query";
import { requireAdmin } from "@/lib/session";
import EmployeeForm from "./employee-form";

export const instant = false;

export default async function EmployeesPage({ searchParams }: PageProps<"/employees">) {
  await requireAdmin();
  const input = await searchParams;
  const q = queryText(input.q);
  const state = input.state === "archived" || input.state === "all" ? input.state : "active";
  const location = queryText(input.location, 128);
  const contains = { contains: q, mode: "insensitive" } as const;
  const where: Prisma.EmployeeWhereInput = {
    archivedAt: state === "all" ? undefined : state === "archived" ? { not: null } : null,
    locationId: location || undefined,
    OR: q ? [{ name: contains }, { email: contains }, { department: contains }, { employeeNumber: contains }, { id: contains }] : undefined,
  };
  const db = database();
  const [locations, total] = await Promise.all([
    db.location.findMany({ select: { id: true, name: true, archivedAt: true }, orderBy: { name: "asc" } }),
    db.employee.count({ where }),
  ]);
  const { page, pages, skip, take } = pageFor(total, queryPage(input.page));
  const employees = await db.employee.findMany({ where, include: {
    location: { select: { name: true } }, _count: { select: { assignments: { where: { returnedAt: null } } } },
  }, orderBy: [{ name: "asc" }, { id: "asc" }], skip, take });
  return (
    <>
      <SectionTitle title="Employees" description="Manage equipment recipients and their assignment history." />
      <details className="panel mb-5 max-w-2xl">
        <summary className="text-lg font-semibold cursor-pointer">Register employee</summary>
        <div className="mt-4"><EmployeeForm locations={locations.filter(row => !row.archivedAt)} /></div>
      </details>
      <ListFilters path="/employees" q={q} filters={[
        { name: "state", label: "Status", value: state, options: ["active", "archived", "all"].map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) })) },
        { name: "location", label: "Location", value: location, options: [{ value: "", label: "All locations" }, ...locations.map(row => ({ value: row.id, label: row.name }))] },
      ]} />
      <section className="panel">
        {employees.length ? <div className="table-wrap" tabIndex={0} role="region" aria-label="Employees">
          <table>
            <thead><tr><th scope="col">Employee</th><th scope="col">Department</th><th scope="col">Location</th><th scope="col">Active assets</th><th scope="col">Status</th></tr></thead>
            <tbody>{employees.map(employee => <tr key={employee.id}>
              <td><div className="flex min-w-44 items-center gap-2.5"><Avatar name={employee.name} /><div>
                <Link className="text-link" href={"/employees/" + employee.id}>{employee.name}</Link>
                <p className="oa-muted text-xs">{employee.employeeNumber ?? employee.id}</p>
              </div></div></td>
              <td>{employee.department ?? "—"}</td><td>{employee.location.name}</td>
              <td>{employee._count.assignments}</td><td><Badge tone={employee.archivedAt ? "muted" : "green"}>{employee.archivedAt ? "Archived" : "Active"}</Badge></td>
            </tr>)}</tbody>
          </table>
        </div> : <EmptyState title="No employees match these filters." />}
        <ListPagination path="/employees" query={{ q, state, location }} page={page} pages={pages} total={total} label="employees" />
      </section>
    </>
  );
}
