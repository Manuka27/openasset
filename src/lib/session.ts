import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "./auth";
import { database } from "./db";
import { roleInput } from "./validation";

export const currentUser = cache(async (requestHeaders?: Headers) => {
  if (!requestHeaders) {
    const [incomingHeaders, cookieStore] = await Promise.all([headers(), cookies()]);
    requestHeaders = new Headers(incomingHeaders);
    // Next can render the workspace in the same action that rotates the session cookie.
    requestHeaders.set("cookie", cookieStore.toString());
  }
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) return null;

  const user = await database().user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true },
  });
  const role = roleInput.safeParse(user?.role);
  return user && role.success ? { ...user, role: role.data } : null;
});

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}
