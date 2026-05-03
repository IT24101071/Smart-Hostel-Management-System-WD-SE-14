/**
 * System tests: HTTP checks against a running API.
 * Prerequisite: MongoDB + start backend from repo `backend/` folder (`npm run dev` or `npm start`).
 * Base URL: TEST_API_URL (default http://127.0.0.1:5000)
 *
 * Optional env:
 *   TEST_STUDENT_TOKEN — Bearer JWT for a student (must be approved / valid)
 *   TEST_ADMIN_TOKEN — Bearer JWT for an admin
 *   TEST_ROOM_ID — Mongo ObjectId string for GET /api/rooms/:id smoke check
 */
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

const base = (process.env.TEST_API_URL || "http://127.0.0.1:5000").replace(
  /\/$/,
  "",
);

let serverReachable = false;

before(async () => {
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 2000);
    const res = await fetch(`${base}/health`, { signal: ac.signal });
    clearTimeout(timer);
    serverReachable = res.ok;
  } catch {
    serverReachable = false;
  }
});

describe("Full system API", () => {
  it("GET /health returns running message", async (t) => {
    if (!serverReachable) {
      t.skip(
        `Backend not reachable at ${base} — start MongoDB and run the API.`,
      );
      return;
    }
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.match(text, /API is running/i);
  });

  it("GET /api/rooms returns data + pagination (public)", async (t) => {
    if (!serverReachable) {
      t.skip(`Backend not reachable at ${base}`);
      return;
    }
    const res = await fetch(`${base}/api/rooms`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.ok(Array.isArray(json.data), "expected json.data array");
    assert.ok(json.pagination, "expected json.pagination");
    assert.ok("total" in json.pagination);
  });

  it("GET /api/auth/me without Authorization returns 401", async (t) => {
    if (!serverReachable) {
      t.skip(`Backend not reachable at ${base}`);
      return;
    }
    const res = await fetch(`${base}/api/auth/me`);
    assert.equal(res.status, 401);
  });

  it("GET /api/auth/me with TEST_STUDENT_TOKEN returns 200", async (t) => {
    const token = process.env.TEST_STUDENT_TOKEN;
    if (!serverReachable) {
      t.skip(`Backend not reachable at ${base}`);
      return;
    }
    if (!token?.trim()) {
      t.skip("Set TEST_STUDENT_TOKEN to run authenticated student check.");
      return;
    }
    const res = await fetch(`${base}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token.trim()}` },
    });
    assert.equal(
      res.status,
      200,
      await res.text().catch(() => ""),
    );
  });

  it("GET /api/payments/bookings with TEST_ADMIN_TOKEN returns 200", async (t) => {
    const token = process.env.TEST_ADMIN_TOKEN;
    if (!serverReachable) {
      t.skip(`Backend not reachable at ${base}`);
      return;
    }
    if (!token?.trim()) {
      t.skip("Set TEST_ADMIN_TOKEN to run admin payments list check.");
      return;
    }
    const res = await fetch(`${base}/api/payments/bookings`, {
      headers: { Authorization: `Bearer ${token.trim()}` },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
  });

  it("GET /api/rooms/:id when TEST_ROOM_ID set", async (t) => {
    const id = process.env.TEST_ROOM_ID?.trim();
    if (!serverReachable) {
      t.skip(`Backend not reachable at ${base}`);
      return;
    }
    if (!id) {
      t.skip("Set TEST_ROOM_ID to smoke-test a single room document.");
      return;
    }
    const res = await fetch(
      `${base}/api/rooms/${encodeURIComponent(id)}`,
    );
    assert.ok(
      res.status === 200 || res.status === 404,
      `unexpected status ${res.status}`,
    );
  });
});
