/**
 * Unit tests: ticket categories, statuses, and edit rules (frontend types).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  TICKET_CATEGORIES,
  TICKET_STATUSES,
  TICKET_URGENCY_LEVELS,
  CATEGORY_ICONS,
  canStudentEditTicket,
} from "../../frontend/types/ticket.js";

describe("Maintenance & complaint ticketing", () => {
  it("defines four categories matching backend model contract", () => {
    assert.equal(TICKET_CATEGORIES.length, 4);
    assert.ok(TICKET_CATEGORIES.includes("Plumbing"));
    assert.ok(TICKET_CATEGORIES.includes("Electrical"));
    assert.ok(TICKET_CATEGORIES.includes("Wi-Fi"));
    assert.ok(TICKET_CATEGORIES.includes("Other"));
  });

  it("maps each category to an Ionicons-style icon key", () => {
    for (const c of TICKET_CATEGORIES) {
      assert.ok(typeof CATEGORY_ICONS[c] === "string", c);
      assert.ok(CATEGORY_ICONS[c].length > 0);
    }
  });

  it("lists lifecycle statuses", () => {
    assert.ok(TICKET_STATUSES.includes("Open"));
    assert.ok(TICKET_STATUSES.includes("Closed"));
  });

  it("lists urgency levels", () => {
    assert.deepEqual(TICKET_URGENCY_LEVELS, ["Low", "Medium", "High"]);
  });

  it("canStudentEditTicket: true for open unassigned ticket", () => {
    assert.equal(
      canStudentEditTicket({
        status: "Open",
        assignees: [],
        assignedTo: null,
      }),
      true,
    );
  });

  it("canStudentEditTicket: false when resolved", () => {
    assert.equal(
      canStudentEditTicket({
        status: "Resolved",
        assignees: [],
        assignedTo: null,
      }),
      false,
    );
  });

  it("canStudentEditTicket: false when assignees exist", () => {
    assert.equal(
      canStudentEditTicket({
        status: "Open",
        assignees: [{ id: "x" }],
        assignedTo: null,
      }),
      false,
    );
  });
});
