import ActionForm from "@/components/ActionForm";
import SectionTitle from "@/components/SectionTitle";
import { Avatar, Badge } from "@/components/WorkspaceUI";
import { database } from "@/lib/db";
import { displayDay, roleLabels } from "@/lib/display";
import { requireUser } from "@/lib/session";
import { changePasswordAction, updateProfileAction } from "../actions";

export const instant = false;

export default async function ProfilePage() {
  const user = await requireUser();
  const account = await database().user.findUniqueOrThrow({ where: { id: user.id },
    select: { createdAt: true, accounts: { where: { providerId: "credential", accountId: user.id }, select: { id: true } } } });
  return (
    <>
      <SectionTitle title="Profile" description="Update your display name and secure your account." />
      <div className="panel mb-4 flex flex-wrap items-center gap-3"><Avatar name={user.name} /><strong className="break-words">{user.name}</strong><Badge tone={user.role === "admin" ? "accent" : "blue"}>{roleLabels[user.role]}</Badge></div>
      <dl className="panel mb-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[["Name", user.name], ["Email", user.email], ["Role", roleLabels[user.role]], ["Account created", displayDay(account.createdAt)]].map(([label,value]) =>
          <div key={label}><dt className="text-sm text-slate-300">{label}</dt><dd className="break-words">{value}</dd></div>)}
      </dl>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="panel">
          <h2 className="mb-4 text-xl font-semibold">Update profile</h2>
          <ActionForm action={updateProfileAction} submit="Save profile" fields={[
            { name: "name", label: "Full name", value: user.name, required: true, maxLength: 120 },
          ]} />
        </section>
        {!!account.accounts.length && <section className="panel">
          <h2 className="mb-4 text-xl font-semibold">Change password</h2>
          <ActionForm action={changePasswordAction} submit="Change password" fields={[
            { name: "currentPassword", label: "Current password", type: "password", autoComplete: "current-password", required: true, maxLength: 128 },
            { name: "newPassword", label: "New password", type: "password", required: true, minLength: 14, maxLength: 128 },
            { name: "confirmPassword", label: "Confirm new password", type: "password", required: true, minLength: 14, maxLength: 128 },
          ]} />
        </section>}
      </div>
    </>
  );
}
