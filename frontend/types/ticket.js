export const TICKET_CATEGORIES = [
  "Plumbing",
  "Electrical",
  "Furniture",
  "Cleaning",
  "Internet",
  "Other",
];

export const TICKET_URGENCY_LEVELS = ["Low", "Medium", "High"];

export const TICKET_STATUSES = ["Open", "In Progress", "Resolved", "Closed"];

export const TICKET_STATUS_COLORS = {
  Open: { bg: "#FFFBEB", border: "#FDE68A", text: "#B45309" },
  "In Progress": { bg: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8" },
  Resolved: { bg: "#ECFDF5", border: "#A7F3D0", text: "#065F46" },
  Closed: { bg: "#F3F4F6", border: "#D1D5DB", text: "#374151" },
};

export const CATEGORY_ICONS = {
  Plumbing: "water-outline",
  Electrical: "flash-outline",
  Furniture: "bed-outline",
  Cleaning: "sparkles-outline",
  Internet: "wifi-outline",
  Other: "construct-outline",
};
