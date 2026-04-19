/**
 * Hostel room gender for allocation (legacy rooms may omit the field).
 * @param {object | null | undefined} room
 * @returns {"male"|"female"}
 */
export function roomGender(room) {
  const g = room?.gender;
  if (g === "male" || g === "female") return g;
  return "male";
}

/**
 * Whether a student user may view/book this room (same gender category).
 * @param {{ gender?: string } | null | undefined} user
 * @param {object | null | undefined} room
 */
export function studentMayViewRoom(user, room) {
  if (!user) return false;
  const ug = user.gender;
  if (ug !== "male" && ug !== "female") return false;
  return ug === roomGender(room);
}
