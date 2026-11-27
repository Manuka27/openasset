import ActionForm from "@/components/ActionForm";
import type { Employee } from "@/generated/prisma/client";
import { saveEmployeeAction } from "../actions";

export default function EmployeeForm({ employee, locations }: {
  employee?: Employee; locations: { id: string; name: string }[];
}) {
  if (!locations.length) return <p>Add an active location to save employees.</p>;
  return <ActionForm action={saveEmployeeAction.bind(null, employee?.id ?? null)} submit={employee ? "Save employee" : "Register employee"} resetOnSuccess={!employee} fields={[
    { name: "employeeNumber", label: "Employee ID", required: !employee, value: employee?.employeeNumber ?? "", maxLength: 48 },
    { name: "name", label: "Full name", required: true, value: employee?.name, maxLength: 120 },
    { name: "email", label: "Email", type: "email", required: true, value: employee?.email, maxLength: 254 },
    { name: "department", label: "Department", value: employee?.department ?? "", maxLength: 120 },
    { name: "locationId", label: "Location", type: "select", required: true, value: employee?.locationId,
      options: locations.map(({ id, name }) => ({ value: id, label: name })) },
  ]} />;
}
