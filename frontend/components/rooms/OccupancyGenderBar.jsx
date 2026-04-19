import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../constants/colors";
import { LANDING } from "../landing/landingTheme";

/**
 * Occupancy progress for Double/Triple shared rooms (capacity &gt; 1).
 * Gender eligibility is enforced by the API; not shown here.
 * @param {{ room: object, variant?: 'landing' | 'detail' | 'admin' }} props
 */
export default function OccupancyGenderBar({ room, variant = "landing" }) {
  const cap = Number(room?.capacity);
  if (!Number.isFinite(cap) || cap <= 1) return null;

  let occ = Number(room?.currentOccupancy);
  if (!Number.isFinite(occ)) occ = 0;
  occ = Math.min(Math.max(occ, 0), cap);

  const ratio = cap > 0 ? occ / cap : 0;

  const isLanding = variant === "landing" || variant === "detail";
  const isAdmin = variant === "admin";
  const fillColor = isAdmin ? COLORS.primary : LANDING.accent;
  const trackBg = isLanding
    ? "rgba(59, 130, 246, 0.15)"
    : COLORS.background;
  const labelColor = isLanding ? LANDING.sectionTitle : COLORS.textSecondary;

  return (
    <View style={[styles.wrap, isAdmin && styles.wrapAdmin]}>
      <View style={styles.rowBetween}>
        <Text style={[styles.occLabel, { color: labelColor }]}>
          {occ} / {cap} beds filled
        </Text>
        {occ >= cap ? (
          <Text style={[styles.fullHint, { color: COLORS.full }]}>Full</Text>
        ) : null}
      </View>
      <View style={[styles.track, { backgroundColor: trackBg }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.round(ratio * 100)}%`,
              backgroundColor: fillColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
    gap: 6,
  },
  wrapAdmin: {
    marginBottom: 8,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  occLabel: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 13,
  },
  fullHint: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 12,
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
  },
});
