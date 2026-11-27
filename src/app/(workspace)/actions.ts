"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { isAPIError } from "better-auth/api";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { database } from "@/lib/db";
import { getAuth } from "@/lib/auth";
import {
  archiveAsset, archiveDirectory, archiveEmployee, hasCode, issueAsset, returnAsset, saveAsset, saveDirectory, saveEmployee,
} from "@/lib/inventory";
import { OperationError, type Actor } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { createUser, setUserRole } from "@/lib/users";
import { assetInput, changePasswordInput, directoryInput, employeeInput, issueInput, profileInput, returnInput, roleInput, userInput } from "@/lib/validation";

async function mutate<Schema extends z.ZodType>(
  schema: Schema,
  form: FormData,
  work: (actor: Actor, input: z.output<Schema>) => Promise<unknown>,
  message: string,
): Promise<ActionState> {
  const actor = await requireUser();
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const errors: NonNullable<ActionState["errors"]> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "form");
      (errors[field] ??= []).push(issue.message);
    }
    return { message: "Check the highlighted fields.", errors };
  }
  try {
    await work(actor, parsed.data);
  } catch (error) {
    if (error instanceof OperationError) return { message: error.message };
    if (hasCode(error, "P2002")) return { message: "That identifier, name, or email is already in use." };
    if (hasCode(error, "P2025") || hasCode(error, "P2034")) return { message: "The record changed. Reload and try again." };
    console.error("OpenAsset mutation failed", error instanceof Error ? error.name : "unknown error");
    return { message: "Could not save the change. Try again." };
  }
  refresh();
  return { success: true, message };
}

export async function saveAssetAction(id: string | null, _previous: ActionState, form: FormData) {
  let assetId = id;
  const result = await mutate(assetInput, form, async (actor, input) => {
    const asset = await saveAsset(database(), actor, input, id ?? undefined);
    assetId = asset.id;
  }, "Asset saved.");
  if (result.success && !id && assetId) redirect("/assets/" + assetId);
  return result;
}

export async function archiveAssetAction(id: string, _previous: ActionState, form: FormData) {
  const result = await mutate(z.object({}), form, actor => archiveAsset(database(), actor, id), "Asset archived.");
  if (result.success) redirect("/assets?status=ARCHIVED");
  return result;
}

export async function saveDirectoryAction(kind: "category" | "location", id: string | null, _previous: ActionState, form: FormData) {
  return mutate(directoryInput, form, (actor, input) => saveDirectory(database(), actor, kind, input.name, id ?? undefined), "Entry saved.");
}

export async function archiveDirectoryAction(kind: "category" | "location", id: string, _previous: ActionState, form: FormData) {
  return mutate(z.object({}), form, actor => archiveDirectory(database(), actor, kind, id), "Entry archived.");
}

export async function saveEmployeeAction(id: string | null, _previous: ActionState, form: FormData) {
  return mutate(employeeInput, form, (actor, input) => saveEmployee(database(), actor, input, id ?? undefined), "Employee saved.");
}

export async function archiveEmployeeAction(id: string, _previous: ActionState, form: FormData) {
  return mutate(z.object({}), form, actor => archiveEmployee(database(), actor, id), "Employee archived.");
}

export async function issueAction(_previous: ActionState, form: FormData) {
  return mutate(issueInput, form, (actor, input) => issueAsset(database(), actor, input), "Asset issued.");
}

export async function returnAction(id: string, _previous: ActionState, form: FormData) {
  form.set("assignmentId", id);
  return mutate(returnInput, form, (actor, input) => returnAsset(database(), actor, input), "Asset returned.");
}

export async function createUserAction(_previous: ActionState, form: FormData) {
  return mutate(userInput, form, (actor, input) => createUser(database(), input, actor), "User created.");
}

export async function setUserRoleAction(id: string, _previous: ActionState, form: FormData) {
  return mutate(z.object({ role: roleInput }), form, (actor, input) => setUserRole(database(), actor, id, input.role), "Role updated.");
}

export async function updateProfileAction(_previous: ActionState, form: FormData) {
  return mutate(profileInput, form, async (_actor, { name }) => {
    await getAuth().api.updateUser({ headers: await headers(), body: { name } });
  }, "Profile updated.");
}

export async function changePasswordAction(_previous: ActionState, form: FormData) {
  return mutate(changePasswordInput, form, async (_actor, { currentPassword, newPassword }) => {
    try {
      await getAuth().api.changePassword({ headers: await headers(), body: { currentPassword, newPassword, revokeOtherSessions: true } });
    } catch (error) {
      if (isAPIError(error) && error.body?.code === "INVALID_PASSWORD") throw new OperationError("The current password is incorrect.");
      throw error;
    }
  }, "Password changed. Other sessions have ended.");
}
