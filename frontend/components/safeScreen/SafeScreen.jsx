import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePathname } from "expo-router";
import { COLORS } from "../../constants/colors";

export default function SafeScreen({ children }) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const isLanding = !pathname || pathname === "/";
  const isStudentRoute = pathname?.startsWith("/student");
  const bg =
    isLanding || isStudentRoute
      ? COLORS.studentScreenBackground
      : "#FFFFFF";
  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          backgroundColor: bg,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
