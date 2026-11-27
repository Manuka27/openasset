"use client";

import { startTransition, useActionState, useId, useRef, type ReactNode } from "react";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import type { ActionState } from "@/lib/action-state";

export type Field = {
  name: string;
  label: string;
  value?: string;
  required?: boolean;
  type?: "text" | "email" | "password" | "date" | "decimal" | "textarea" | "select";
  options?: { value: string; label: string }[];
  maxLength?: number;
  minLength?: number;
  autoComplete?: string;
};

type Props = {
  action: (state: ActionState, data: FormData) => Promise<ActionState>;
  fields?: Field[];
  submit: string;
  confirm?: { title: string; detail: string };
  children?: ReactNode;
  resetOnSuccess?: boolean;
};

export default function ActionForm({ action, fields = [], submit, confirm, children, resetOnSuccess }: Props) {
  const form = useRef<HTMLFormElement>(null);
  const [state, dispatch, pending] = useActionState(async (previous: ActionState, data: FormData) => {
    const result = await action(previous, data);
    if (result.success && resetOnSuccess) form.current?.reset();
    form.current?.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach(input => { input.value = ""; });
    return result;
  }, {});
  const uid = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const formId = uid + "-form";

  return (
    <>
      <form ref={form} id={formId} action={dispatch} className="grid gap-4" onSubmit={event => {
        event.preventDefault();
        if (pending) return;
        const data = new FormData(event.currentTarget);
        startTransition(() => dispatch(data));
      }}>
        {!!fields.length && <div className="oa-form-fields">{fields.map(field => {
          const errors = state.errors?.[field.name];
          const labelId = uid + "-" + field.name + "-label";
          const errorId = uid + "-" + field.name + "-error";
          const common = {
            name: field.name,
            defaultValue: field.value ?? "",
            required: field.required,
            "aria-labelledby": labelId,
            "aria-invalid": Boolean(errors),
            "aria-describedby": errors ? errorId : undefined,
          };
          return (
            <label key={field.name} className={field.type === "textarea" ? "col-span-full" : undefined}>
              <span id={labelId}>{field.label}</span>
              {field.type === "select" ? (
                <select {...common}>
                  <option value="">Choose an option</option>
                  {field.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              ) : field.type === "textarea" ? (
                <textarea {...common} maxLength={field.maxLength} rows={3} />
              ) : (
                <input {...common} type={field.type === "decimal" ? "text" : field.type ?? "text"} inputMode={field.type === "decimal" ? "decimal" : undefined} minLength={field.minLength} maxLength={field.maxLength} autoComplete={field.autoComplete ?? (field.type === "password" ? "new-password" : undefined)} />
              )}
              {errors && <span id={errorId} className="text-rose-300">{errors.join(" ")}</span>}
            </label>
          );
        })}</div>}
        {children}
        {state.message && <p role={state.success ? "status" : "alert"} className="oa-feedback flex items-center gap-2">
          {state.success ? <CircleCheck size={17} aria-hidden="true" /> : <CircleAlert size={17} aria-hidden="true" />}{state.message}
        </p>}
        <div>
          <button className={confirm ? "button" : "button primary"} type={confirm ? "button" : "submit"} disabled={pending} onClick={confirm ? () => dialog.current?.showModal() : undefined}>
            {pending && <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" />}{pending ? "Working…" : submit}
          </button>
        </div>
      </form>
      {confirm && (
        <dialog ref={dialog} aria-labelledby={uid + "-title"} className="panel fixed inset-0 m-auto w-[min(26rem,90vw)] text-slate-100 backdrop:bg-black/60">
          <h2 id={uid + "-title"} className="mb-2 text-xl font-semibold">{confirm.title}</h2>
          <p className="mb-4 text-slate-300">{confirm.detail}</p>
          <div className="flex gap-2">
            <form method="dialog"><button type="submit" className="button" autoFocus>Cancel</button></form>
            <button type="submit" form={formId} className="button primary" disabled={pending} onClick={() => dialog.current?.close()}>{submit}</button>
          </div>
        </dialog>
      )}
    </>
  );
}
