import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);
const required = (max: number) => text(max).min(1, "This field is required.");
const id = z.string().min(1).max(128);
const optionalText = (max: number) => text(max).transform(value => value || null);
const optionalDate = z.union([z.literal(""), z.iso.date()]).transform(value =>
  value ? new Date(value + "T00:00:00.000Z") : null,
);
const email = z.string().trim().toLowerCase().pipe(z.email().max(254));
export const roleInput = z.enum(["admin", "staff"]);
export const passwordInput = z.string().min(14).max(128);
export const profileInput = z.object({ name: required(120) });
export const changePasswordInput = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordInput,
  confirmPassword: passwordInput,
}).refine(value => value.newPassword === value.confirmPassword, {
  path: ["confirmPassword"], message: "The new passwords must match.",
}).refine(value => value.currentPassword !== value.newPassword, {
  path: ["newPassword"], message: "Choose a different password.",
});

export const assetInput = z.object({
  tag: required(48).regex(/^[a-z0-9][a-z0-9._-]*$/i, "Use letters, numbers, dots, underscores, or hyphens.").toUpperCase(),
  name: required(120),
  categoryId: id,
  locationId: id,
  brand: optionalText(80),
  model: optionalText(80),
  serialNumber: optionalText(120),
  purchaseDate: optionalDate,
  purchaseCost: text(13).regex(/^(?:\d{1,10}(?:\.\d{1,2})?)?$/, "Enter a nonnegative amount with up to two decimal places.").transform(value => value || null),
  warrantyExpiry: optionalDate,
  notes: optionalText(2000),
  status: z.enum(["AVAILABLE", "MAINTENANCE"]),
}).refine(value => !value.purchaseDate || !value.warrantyExpiry || value.warrantyExpiry >= value.purchaseDate, {
  path: ["warrantyExpiry"], message: "Warranty expiry must be on or after the purchase date.",
});

export const directoryInput = z.object({ name: required(120) });
export const employeeInput = z.object({
  employeeNumber: text(48).regex(/^(?:[a-z0-9][a-z0-9._-]*)?$/i, "Use letters, numbers, dots, underscores, or hyphens.")
    .transform(value => value.toUpperCase() || null),
  name: required(120),
  department: optionalText(120),
  email,
  locationId: id,
});
export const issueInput = z.object({
  assetId: id,
  employeeId: id,
  expectedReturnDate: optionalDate,
});
export const returnConditions = ["GOOD", "NEEDS_SERVICE", "DAMAGED"] as const;
export const returnInput = z.object({
  assignmentId: id,
  returnCondition: z.enum(returnConditions),
  returnNotes: optionalText(2000),
});
export const userInput = z.object({ name: required(120), email, role: roleInput, password: passwordInput });
