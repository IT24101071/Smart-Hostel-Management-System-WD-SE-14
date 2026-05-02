import { parseNic } from "./nicValidation.js";

const TYPES = ["nic", "passport"];

/**
 * Passport-style: 6–20 chars, letters, digits, hyphens.
 */
function parsePassport(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return { ok: false, message: "Passport number is required" };
  }
  const compact = raw.replace(/\s+/g, "");
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
  return { ok: true, normalized: compact.toUpperCase() };
}

/**
 * @returns {{ ok: true, normalizedNumber: string } | { ok: false, message: string }}
 */
export function validateBookingIdentity({ type, number }) {
  const t = String(type ?? "").trim().toLowerCase();
  if (!TYPES.includes(t)) {
    return {
      ok: false,
      message: "identityDocumentType must be nic or passport",
    };
  }

  if (t === "nic") {
    const parsed = parseNic(number);
    if (!parsed.ok) return parsed;
    return { ok: true, normalizedNumber: parsed.normalized };
  }

  const pass = parsePassport(number);
  if (!pass.ok) return pass;
  return { ok: true, normalizedNumber: pass.normalized };
}
