/**
 * Unit tests: Room category & inventory (types, availability rules).
 * Keeps contract alignment with backend `room.controller.js` and frontend `types/room.js`.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ROOM_TYPES,
  ROOM_GENDERS,
  AVAILABILITY_STATUSES,
} from "../../frontend/types/room.js";

/** Mirrors `recalculateAvailability` in backend room / booking code. */
function recalculateAvailability({ currentOccupancy, capacity, status }) {
  if (status === "Maintenance") return "Maintenance";
  return currentOccupancy >= capacity ? "Full" : "Available";
}

describe("Room category & inventory", () => {
  it("exports expected room types (Single, Double, Triple)", () => {
    assert.deepEqual(ROOM_TYPES, ["Single", "Double", "Triple"]);
  });

  it("exports binary gender keys for rooms", () => {
    assert.deepEqual(ROOM_GENDERS, ["male", "female"]);
  });

  it("exports availability lifecycle statuses", () => {
    assert.deepEqual(AVAILABILITY_STATUSES, [
      "Available",
      "Full",
      "Maintenance",
    ]);
  });

  it("recalculateAvailability: full when at capacity", () => {
    assert.equal(
      recalculateAvailability({
        currentOccupancy: 2,
        capacity: 2,
        status: "Available",
      }),
      "Full",
    );
  });

  it("recalculateAvailability: available when under capacity", () => {
    assert.equal(
      recalculateAvailability({
        currentOccupancy: 1,
        capacity: 2,
        status: "Available",
      }),
      "Available",
    );
  });

  it("recalculateAvailability: maintenance overrides occupancy", () => {
    assert.equal(
      recalculateAvailability({
        currentOccupancy: 0,
        capacity: 2,
        status: "Maintenance",
      }),
      "Maintenance",
    );
  });
});
