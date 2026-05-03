import { validateNicInput } from "./nicValidation";

/**
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateBookingIdentityInput(type, number) {
  const t = String(type ?? "").trim().toLowerCase();
  if (t !== "nic" && t !== "passport") {
    return { ok: false, message: "Select NIC or passport" };
  }
  if (t === "nic") {
    return validateNicInput(number);
  }
  const compact = String(number ?? "").trim().replace(/\s+/g, "");
  if (!compact) {
    return { ok: false, message: "Passport number is required" };
  }
  if (compact.length < 6 || compact.length > 20) {
    return {
      ok: false,
      message: "Passport number must be between 6 and 20 characters",
    };
  }
  if (!/^[A-Za-z0-9-]+$/.test(compact)) {
    return {
      ok: false,
      message: "Passport number may only contain letters, digits, and hyphens",
    };
  }
  return { ok: true };
}
