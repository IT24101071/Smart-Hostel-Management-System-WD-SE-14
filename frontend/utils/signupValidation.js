/** Signup field rules (keep aligned with backend/utils/signupValidation.js). */

export const SIGNUP_PHONE_PREFIX = "+94";
export const SIGNUP_LOCAL_PHONE_DIGITS = 9;

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

/** Inline message while typing: empty field yields ok:true so no red until optional blur logic */
export function validateSignupNameTyping(value, label = "Name") {
  const s = String(value ?? "");
  if (!s.trim()) return { ok: true };
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

export function validateSignupEmailTyping(email) {
  const raw = String(email ?? "").trim();
  if (!raw) return { ok: true };
  return validateSignupEmailFormat(email);
}

export function validateSignupPassword(password) {
  const p = String(password ?? "");
  if (!p) return { ok: false, message: "Password is required" };
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

export function validateSignupPasswordTyping(password) {
  const p = String(password ?? "");
  if (!p) return { ok: true };
  return validateSignupPassword(password);
}

export function validateSignupPhoneDigits(localDigits, label = "Contact number") {
  const d = String(localDigits ?? "").replace(/\D/g, "");
  if (d.length !== SIGNUP_LOCAL_PHONE_DIGITS) {
    return {
      ok: false,
      message: `${label}: enter exactly ${SIGNUP_LOCAL_PHONE_DIGITS} digits`,
    };
  }
  return { ok: true };
}

export function validateSignupPhoneDigitsTyping(localDigits) {
  const d = String(localDigits ?? "").replace(/\D/g, "");
  if (!d) return { ok: true };
  if (d.length !== SIGNUP_LOCAL_PHONE_DIGITS) {
    return {
      ok: false,
      message: `Enter exactly ${SIGNUP_LOCAL_PHONE_DIGITS} digits`,
    };
  }
  return { ok: true };
}

export function digitsToFullPhone(localDigits) {
  const d = String(localDigits ?? "")
    .replace(/\D/g, "")
    .slice(0, SIGNUP_LOCAL_PHONE_DIGITS);
  return `${SIGNUP_PHONE_PREFIX}${d}`;
}

export function validateSignupStudentId(studentId) {
  const s = String(studentId ?? "").trim();
  if (!s) return { ok: false, message: "Student ID is required" };
  return { ok: true };
}

export function validateSignupStudentIdTyping(studentId) {
  const s = String(studentId ?? "").trim();
  if (!s) return { ok: true };
  return { ok: true };
}
