/**
 * Unit tests: signup validation helpers (frontend/utils/signupValidation.js).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateSignupPassword,
  validateSignupEmailFormat,
  validateSignupName,
  validateSignupPhoneDigits,
  digitsToFullPhone,
  SIGNUP_LOCAL_PHONE_DIGITS,
  SIGNUP_PHONE_PREFIX,
} from "../../frontend/utils/signupValidation.js";

describe("signupValidation", () => {
  it("rejects names containing digits", () => {
    assert.equal(validateSignupName("John2", "Full name").ok, false);
    assert.equal(validateSignupName("John Doe", "Full name").ok, true);
  });

  it("validates email shape", () => {
    assert.equal(validateSignupEmailFormat("a@b.co").ok, true);
    assert.equal(validateSignupEmailFormat("not-an-email").ok, false);
  });

  it("requires password length > 6 with letter, digit, special", () => {
    assert.equal(validateSignupPassword("Ab1!").ok, false);
    assert.equal(validateSignupPassword("longenough1a").ok, false);
    assert.equal(validateSignupPassword("longEnough1!").ok, true);
  });

  it("requires exactly 9 local digits for phone", () => {
    assert.equal(
      validateSignupPhoneDigits("771234567").ok,
      SIGNUP_LOCAL_PHONE_DIGITS === 9,
    );
    assert.equal(validateSignupPhoneDigits("77123456").ok, false);
  });

  it("digitsToFullPhone prefixes +94", () => {
    assert.equal(digitsToFullPhone("771234567"), `${SIGNUP_PHONE_PREFIX}771234567`);
  });
});
