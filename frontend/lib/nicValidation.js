/**
 * Client-side SL NIC check (match backend/utils/nicValidation.js).
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateNicInput(value) {
  const raw = String(value ?? "")
    .trim()
    .replace(/[\s-]/g, "");
  if (!raw) {
    return { ok: false, message: "NIC number is required" };
  }
  if (/^\d{12}$/.test(raw)) {
    return { ok: true };
  }
  const oldFmt = /^(\d{9})([vVxX])$/;
  if (oldFmt.test(raw)) {
    return { ok: true };
  }
  return {
    ok: false,
    message:
      "Invalid NIC. Use 12 digits (new) or 9 digits + V or X (old).",
  };
}
