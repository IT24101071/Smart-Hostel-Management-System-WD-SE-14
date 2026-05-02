/**
 * Sri Lanka NIC: old format 9 digits + V/X, new format 12 digits.
 */

function stripNoise(value) {
  return String(value ?? "")
    .trim()
    .replace(/[\s-]/g, "");
}

/**
 * @returns {{ ok: true, normalized: string } | { ok: false, message: string }}
 */
export function parseNic(value) {
  const raw = stripNoise(value);
  if (!raw) {
    return { ok: false, message: "NIC number is required" };
  }

  if (/^\d{12}$/.test(raw)) {
    return { ok: true, normalized: raw };
  }

  const oldFmt = /^(\d{9})([vVxX])$/;
  const m = raw.match(oldFmt);
  if (m) {
    return { ok: true, normalized: `${m[1]}${m[2].toUpperCase()}` };
  }

  return {
    ok: false,
    message:
      "Invalid NIC. Use 12 digits (new) or 9 digits followed by V or X (old).",
  };
}
