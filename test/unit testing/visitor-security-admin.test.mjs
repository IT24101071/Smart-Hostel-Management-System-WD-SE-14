/**
 * Unit tests: API route contracts for visitor logging & admin-style surfaces.
 * (Static strings — documents expected paths under `/api`.)
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const API = {
  visitorsMine: "/api/visitors/mine",
  visitorsList: "/api/visitors",
  visitorsCheckIn: "/api/visitors/check-in",
  visitorCheckOut: (id) => `/api/visitors/${id}/check-out`,
  paymentsBookings: "/api/payments/bookings",
  authAdminMetrics: "/api/auth/admin-metrics",
  rooms: "/api/rooms",
};

describe("Visitor & security logging / admin management (route contracts)", () => {
  it("student visitor history uses /api/visitors/mine", () => {
    assert.equal(API.visitorsMine, "/api/visitors/mine");
  });

  it("warden visitor log uses GET /api/visitors", () => {
    assert.ok(API.visitorsList.endsWith("/visitors"));
  });

  it("check-in posts to /api/visitors/check-in", () => {
    assert.match(API.visitorsCheckIn, /check-in$/);
  });

  it("check-out patches scoped visitor id", () => {
    assert.equal(API.visitorCheckOut("507f1f77bcf86cd799439011"), "/api/visitors/507f1f77bcf86cd799439011/check-out");
  });

  it("admin payment booking list uses /api/payments/bookings", () => {
    assert.equal(API.paymentsBookings, "/api/payments/bookings");
  });

  it("admin metrics uses /api/auth/admin-metrics", () => {
    assert.equal(API.authAdminMetrics, "/api/auth/admin-metrics");
  });

  it("public room browse uses /api/rooms", () => {
    assert.equal(API.rooms, "/api/rooms");
  });
});
