/** Shared signup field rules (aligned with frontend/utils/signupValidation.js). */

export const SIGNUP_PHONE_PREFIX = "+94";
export const SIGNUP_LOCAL_PHONE_DIGITS = 9;
export const SIGNUP_PASSWORD_MIN_LEN = 7;

export function normalizeSignupEmail(email) {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

export function validateSignupName(value, label = "Name") {
  const s = String(value ?? "").trim();
  if (!s) return { ok: false, message: `${label} is required` };
  if (/\d/.test(s)) {
    return { ok: false, message: `${label} cannot contain numbers` };
  }
  return { ok: true };
}

export function validateSignupEmailFormat(email) {
  const s = normalizeSignupEmail(email);
  if (!s) return { ok: false, message: "Email is required" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) {
    return { ok: false, message: "Enter a valid email address" };
  }
  return { ok: true };
}

export function validateSignupPassword(password) {
  const p = String(password ?? "");
  if (p.length <= 6) {
    return {
      ok: false,
      message: "Password must be longer than 6 characters",
    };
  }
  if (!/[A-Za-z]/.test(p)) {
    return { ok: false, message: "Password must include a letter" };
  }
  if (!/[0-9]/.test(p)) {
    return { ok: false, message: "Password must include a number" };
  }
  if (!/[^A-Za-z0-9]/.test(p)) {
    return { ok: false, message: "Password must include a special character" };
  }
  return { ok: true };
}

/** Full international form e.g. +94771234567 */
export function validateSignupPhoneFull(phone, label = "Contact number") {
  const s = String(phone ?? "").trim();
  if (!s) return { ok: false, message: `${label} is required` };
  if (!/^\+94\d{9}$/.test(s)) {
    return {
      ok: false,
      message: `Enter exactly ${SIGNUP_LOCAL_PHONE_DIGITS} digits after ${SIGNUP_PHONE_PREFIX}`,
    };
  }
  return { ok: true };
}

export function validateSignupStudentId(studentId) {
  const s = String(studentId ?? "").trim();
  if (!s) return { ok: false, message: "Student ID is required" };
  return { ok: true };
}
