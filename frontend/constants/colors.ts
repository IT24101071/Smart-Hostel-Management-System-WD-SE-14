export const COLORS = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#EFF6FF",

  background: "#F3F4F6",
  white: "#FFFFFF",
  cardBg: "#FFFFFF",

  textPrimary: "#111827",
  textSecondary: "#374151",
  textMuted: "#6B7280",

  border: "#E5E7EB",
  inputBg: "#F9FAFB",

  available: "#15803D",
  availableBg: "#DCFCE7",
  availableBorder: "#BBF7D0",

  full: "#B45309",
  fullBg: "#FEF3C7",
  fullBorder: "#FDE68A",

  maintenance: "#B91C1C",
  maintenanceBg: "#FEE2E2",
  maintenanceBorder: "#FECACA",

  purple: "#7C3AED",
  purpleBg: "#F5F3FF",

  teal: "#0D9488",
  tealBg: "#F0FDFA",

  indigo: "#4338CA",
  indigoBg: "#EEF2FF",

  orange: "#EA580C",
  orangeBg: "#FFF7ED",

  rose: "#E11D48",
  roseBg: "#FFF1F2",
} as const;

export type StatusType = "Available" | "Full" | "Maintenance";

export const STATUS_COLORS: Record<
  StatusType,
  { text: string; bg: string; border: string }
> = {
  Available: {
    text: COLORS.available,
    bg: COLORS.availableBg,
    border: COLORS.availableBorder,
  },
  Full: {
    text: COLORS.full,
    bg: COLORS.fullBg,
    border: COLORS.fullBorder,
  },
  Maintenance: {
    text: COLORS.maintenance,
    bg: COLORS.maintenanceBg,
    border: COLORS.maintenanceBorder,
  },
};
