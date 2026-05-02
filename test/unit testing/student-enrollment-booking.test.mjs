/**
 * Unit tests: student booking identity (NIC / passport) validation.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateBookingIdentity } from "../../backend/utils/identityDocumentValidation.js";

describe("Student enrollment & booking (identity validation)", () => {
  it("accepts new-format 12-digit NIC", () => {
    const r = validateBookingIdentity({
      type: "nic",
      number: "200512345678",
    });
    assert.equal(r.ok, true);
    assert.equal(r.normalizedNumber, "200512345678");
  });

  it("accepts old-format NIC with V", () => {
    const r = validateBookingIdentity({ type: "nic", number: "123456789V" });
    assert.equal(r.ok, true);
    assert.equal(r.normalizedNumber, "123456789V");
  });

  it("rejects invalid NIC", () => {
    const r = validateBookingIdentity({ type: "nic", number: "abc" });
    assert.equal(r.ok, false);
  });

  it("accepts valid passport number", () => {
    const r = validateBookingIdentity({
      type: "passport",
      number: "AB-1234567",
    });
    assert.equal(r.ok, true);
    assert.equal(r.normalizedNumber, "AB-1234567");
  });

  it("rejects empty passport", () => {
    const r = validateBookingIdentity({ type: "passport", number: "  " });
    assert.equal(r.ok, false);
  });

  it("rejects invalid document type", () => {
    const r = validateBookingIdentity({ type: "dl", number: "X" });
    assert.equal(r.ok, false);
  });
});
