import { Pressable, StyleSheet, Text, View } from 'react-native';
import SmartHostelLogo from '../SmartHostelLogo';
import { LANDING } from './landingTheme';

export default function LandingNavbar({ onLogin }) {
  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        <SmartHostelLogo width={40} height={40} />
        <Text style={styles.brand}>Smart Hostel</Text>
      </View>
      <Pressable style={styles.loginBtn} onPress={onLogin} hitSlop={8}>
        <Text style={styles.loginText}>Login</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: LANDING.cardBg,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brand: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 18,
    color: '#1C1B1F',
  },
  loginBtn: {
    backgroundColor: LANDING.accent,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  loginText: {
    fontFamily: 'PublicSans_600SemiBold',
    color: '#FFFFFF',
    fontSize: 14,
  },
});
