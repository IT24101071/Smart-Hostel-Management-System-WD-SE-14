/** Keep in sync with `backend/models/Ticket.js` TICKET_CATEGORIES */
export const TICKET_CATEGORIES = ["Plumbing", "Electrical", "Wi-Fi", "Other"];

export const TICKET_URGENCY_LEVELS = ["Low", "Medium", "High"];

export const TICKET_STATUSES = ["Open", "In Progress", "Resolved", "Closed"];

/** Student may edit only while not Resolved/Closed and ticket has no assignee. */
export function canStudentEditTicket(ticket) {
  if (!ticket) return false;
  if (ticket.status === "Resolved" || ticket.status === "Closed") return false;
  const list = Array.isArray(ticket.assignees) ? ticket.assignees : [];
  if (list.length > 0) return false;
  return !ticket.assignedTo?.id && !ticket.assignedTo?._id;
}

export const TICKET_STATUS_COLORS = {
  Open: { bg: "#FFFBEB", border: "#FDE68A", text: "#B45309" },
  "In Progress": { bg: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8" },
  Resolved: { bg: "#ECFDF5", border: "#A7F3D0", text: "#065F46" },
  Closed: { bg: "#F3F4F6", border: "#D1D5DB", text: "#374151" },
};

export const CATEGORY_ICONS = {
  Plumbing: "water-outline",
  Electrical: "flash-outline",
  "Wi-Fi": "wifi-outline",
  Other: "construct-outline",
};
