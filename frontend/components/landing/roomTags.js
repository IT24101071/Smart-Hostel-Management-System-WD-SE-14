/**
 * Shared tag strings for room cards and room detail (capacity, type, snippet).
 * @param {object} room
 * @param {{ maxTags?: number }} [options]
 * @returns {string[]}
 */
export function buildRoomTags(room, options = {}) {
  const maxTags = options.maxTags ?? 3;
  const tags = [`${room.capacity} Bed${room.capacity !== 1 ? 's' : ''}`, room.roomType];
  return tags.slice(0, maxTags);
}
