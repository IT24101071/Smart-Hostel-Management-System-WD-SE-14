import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../constants/colors";

export default function AdminSubHeader({
  title,
  subtitle,
  onBack,
  rightElement,
}) {
  return (
    <View style={styles.row}>
      <Pressable
        style={styles.backWrap}
        onPress={onBack}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
      </Pressable>
      <View style={styles.center}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
      <View style={styles.right}>
        {rightElement ?? <View style={styles.spacer} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  backWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 17,
    color: COLORS.textPrimary,
  },
  sub: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  right: {
    minWidth: 40,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  spacer: {
    width: 40,
    height: 40,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
});

export function AdminSubHeaderIconButton({ icon, onPress }) {
  return (
    <Pressable style={styles.iconBtn} onPress={onPress} hitSlop={8}>
      <Ionicons name={icon} size={20} color={COLORS.primary} />
    </Pressable>
  );
}
