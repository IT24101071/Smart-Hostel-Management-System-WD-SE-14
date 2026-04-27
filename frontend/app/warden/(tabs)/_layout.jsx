import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { COLORS } from "../../../constants/colors";
import { storage } from "../../../lib/storage";

const ICON_SIZE = 24;

export default function WardenTabsLayout() {
  const [role, setRole] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const user = await storage.getUser();
      if (!mounted) return;
      setRole(user?.role ?? null);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const isStaff = role === "staff";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size ?? ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: "Tickets",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ticket-outline" size={size ?? ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="staff"
        options={{
          title: "Staff",
          href: isStaff ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size ?? ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: "Students",
          href: isStaff ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="school-outline" size={size ?? ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="rooms"
        options={{
          title: "Rooms",
          href: isStaff ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bed-outline" size={size ?? ICON_SIZE} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    paddingTop: 4,
  },
  tabLabel: {
    fontFamily: "PublicSans_500Medium",
    fontSize: 10,
    marginBottom: 2,
  },
});
