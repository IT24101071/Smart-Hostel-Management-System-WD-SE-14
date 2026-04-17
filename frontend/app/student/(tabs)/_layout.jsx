import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { COLORS } from '../../../constants/colors';

const accountSource = require('../../../assets/icons/account.svg');

const ICON_SIZE = 24;

function TabIconWrap({ focused, children }) {
  return (
    <View style={[styles.iconBubble, focused && styles.iconBubbleActive]}>
      {children}
    </View>
  );
}

export default function StudentTabsLayout() {
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
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIconWrap focused={focused}>
              <Ionicons
                name="home-outline"
                size={ICON_SIZE}
                color={focused ? COLORS.primary : COLORS.textMuted}
              />
            </TabIconWrap>
          ),
        }}
      />
      <Tabs.Screen
        name="booking"
        options={{
          title: 'Booking',
          tabBarIcon: ({ focused }) => (
            <TabIconWrap focused={focused}>
              <Ionicons
                name="calendar-outline"
                size={ICON_SIZE}
                color={focused ? COLORS.primary : COLORS.textMuted}
              />
            </TabIconWrap>
          ),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          tabBarIcon: ({ focused }) => (
            <TabIconWrap focused={focused}>
              <Ionicons
                name="cash-outline"
                size={ICON_SIZE}
                color={focused ? COLORS.primary : COLORS.textMuted}
              />
            </TabIconWrap>
          ),
        }}
      />
      <Tabs.Screen
        name="support"
        options={{
          title: 'Support',
          tabBarIcon: ({ focused }) => (
            <TabIconWrap focused={focused}>
              <Ionicons
                name="chatbubble-outline"
                size={ICON_SIZE}
                color={focused ? COLORS.primary : COLORS.textMuted}
              />
            </TabIconWrap>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIconWrap focused={focused}>
              <Image
                source={accountSource}
                style={[
                  styles.profileIcon,
                  { opacity: focused ? 1 : 0.65 },
                ]}
                contentFit="contain"
              />
            </TabIconWrap>
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
    fontFamily: 'PublicSans_500Medium',
    fontSize: 10,
    marginBottom: 2,
  },
  iconBubble: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  iconBubbleActive: {
    backgroundColor: COLORS.primaryLight,
  },
  profileIcon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
});
