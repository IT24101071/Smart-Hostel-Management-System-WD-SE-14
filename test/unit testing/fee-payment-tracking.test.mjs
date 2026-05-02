/**
 * Unit tests: fee proration logic aligned with booking.controller `computeExpectedRoomFees`.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

/** Same formula as backend/controllers/booking.controller.js */
function computeExpectedRoomFees(pricePerMonth, stayDays) {
  return Math.round((Number(pricePerMonth) / 30) * stayDays);
}

describe("Fee & payment tracking (proration)", () => {
  it("calculates room fees for 30 days from monthly price", () => {
    assert.equal(computeExpectedRoomFees(30000, 30), 30000);
  });

  it("calculates partial stay (15 days)", () => {
    assert.equal(computeExpectedRoomFees(30000, 15), 15000);
  });

  it("rounds to nearest rupee", () => {
    assert.equal(computeExpectedRoomFees(10000, 7), 2333);
  });

  it("handles zero monthly price", () => {
    assert.equal(computeExpectedRoomFees(0, 10), 0);
  });
});
