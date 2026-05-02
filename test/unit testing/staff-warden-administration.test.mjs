/**
 * Unit tests: NIC parsing for staff / warden (operational accounts).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseNic } from "../../backend/utils/nicValidation.js";

describe("Staff & warden administration (NIC validation)", () => {
  it("normalizes 12-digit new NIC", () => {
    const r = parseNic(" 2005 1234 5678 ");
    assert.equal(r.ok, true);
    assert.equal(r.normalized, "200512345678");
  });

  it("normalizes old NIC with x", () => {
    const r = parseNic("123456789x");
    assert.equal(r.ok, true);
    assert.equal(r.normalized, "123456789X");
  });

  it("rejects short input", () => {
    const r = parseNic("12345");
    assert.equal(r.ok, false);
  });

  it("rejects empty", () => {
    const r = parseNic("");
    assert.equal(r.ok, false);
  });
});
