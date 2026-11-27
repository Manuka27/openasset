import ActionForm from "@/components/ActionForm";
import { ListFilters, ListPagination } from "@/components/ListControls";
import SectionTitle from "@/components/SectionTitle";
import { Avatar, Badge, EmptyState } from "@/components/WorkspaceUI";
import { database } from "@/lib/db";
import { displayDay, roleLabels } from "@/lib/display";
import { pageFor, queryPage, queryText } from "@/lib/list-query";
import { requireAdmin } from "@/lib/session";
import { createUserAction, setUserRoleAction } from "../actions";

export const instant = false;

const roleOptions = Object.entries(roleLabels).map(([value, label]) => ({ value, label }));

export default async function UsersPage({ searchParams }: PageProps<"/users">) {
  const admin = await requireAdmin();
  const input = await searchParams;
  const q = queryText(input.q);
  const role = input.role === "admin" || input.role === "staff" ? input.role : "";
  const contains = { contains: q, mode: "insensitive" } as const;
  const where = { role: role || undefined, OR: q ? [{ name: contains }, { email: contains }] : undefined };
  const db = database();
  const total = await db.user.count({ where });
  const { page, pages, skip, take } = pageFor(total, queryPage(input.page));
  const users = await db.user.findMany({ where, select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: [{ name: "asc" }, { id: "asc" }], skip, take });
  return (
    <>
      <SectionTitle title="Users" description="Manage workspace accounts and access roles." />
      <details className="panel mb-5 max-w-2xl">
        <summary className="text-lg font-semibold cursor-pointer">Create user</summary>
        <div className="mt-4">
          <p className="mb-4 text-slate-300">Set a unique initial password and share it privately. The user can change it in Profile.</p>
          <ActionForm action={createUserAction} submit="Create user" resetOnSuccess fields={[
            { name: "name", label: "Full name", required: true, maxLength: 120 },
            { name: "email", label: "Email", type: "email", required: true, maxLength: 254 },
            { name: "role", label: "Role", type: "select", value: "staff", required: true, options: roleOptions },
            { name: "password", label: "Initial password", type: "password", required: true, minLength: 14, maxLength: 128 },
          ]} />
        </div>
      </details>
      <ListFilters path="/users" q={q} filters={[{ name: "role", label: "Role", value: role, options: [{ value: "", label: "All roles" }, ...roleOptions] }]} />
      <section className="panel">
        {users.length ? <div className="table-wrap" tabIndex={0} role="region" aria-label="Users">
          <table>
            <thead><tr><th scope="col">User</th><th scope="col">Role</th><th scope="col">Created</th><th scope="col">Actions</th></tr></thead>
            <tbody>{users.map(user => <tr key={user.id}>
              <td><div className="flex min-w-44 items-center gap-2.5"><Avatar name={user.name} /><div className="min-w-0">{user.name}<p className="oa-muted text-xs">{user.email}</p></div></div></td>
              <td><Badge tone={user.role === "admin" ? "accent" : "blue"}>{user.role === "admin" ? roleLabels.admin : user.role === "staff" ? roleLabels.staff : "Unrecognized role"}</Badge></td>
              <td>{displayDay(user.createdAt)}</td>
              <td className="min-w-52">{user.id === admin.id ? "Your account" : <details>
                <summary className="text-link cursor-pointer">Change role</summary>
                <div className="mt-3"><ActionForm action={setUserRoleAction.bind(null, user.id)} submit="Change role"
                  confirm={{ title: "Change this user’s role?", detail: "Their existing sessions will end and they will need to sign in again." }}
                  fields={[{ name: "role", label: "New role", type: "select", value: user.role, required: true, options: roleOptions }]} /></div>
              </details>}</td>
            </tr>)}</tbody>
          </table>
        </div> : <EmptyState title="No users match these filters." />}
        <ListPagination path="/users" query={{ q, role }} page={page} pages={pages} total={total} label="users" />
      </section>
    </>
  );
}
