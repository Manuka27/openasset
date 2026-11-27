export function displayDay(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "—";
}

export function displayTime(value: Date | null) {
  return value ? value.toISOString().slice(0, 16).replace("T", " ") + " UTC" : "—";
}

export const statusLabels = {
  AVAILABLE: "Available",
  ISSUED: "Issued",
  MAINTENANCE: "Maintenance",
  ARCHIVED: "Archived",
};

export const roleLabels = { admin: "Admin", staff: "IT Staff" };
