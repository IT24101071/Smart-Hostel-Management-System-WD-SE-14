import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { LANDING } from './landingTheme';

const FEATURES = [
  { icon: 'calendar-outline', label: 'Instant Booking' },
  { icon: 'business-outline', label: 'Digital Payments' },
  { icon: 'construct-outline', label: 'One-Tap Service' },
  { icon: 'shield-checkmark-outline', label: 'Smart Security' },
];

export default function LandingFeatureGrid() {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>All-In-One Smart Hub</Text>
      <View style={styles.grid}>
        {FEATURES.map((item) => (
          <View key={item.label} style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name={item.icon} size={28} color={LANDING.accent} />
            </View>
            <Text style={styles.cardText}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  heading: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 20,
    color: LANDING.sectionTitle,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '47%',
    flexGrow: 1,
    minWidth: '45%',
    backgroundColor: LANDING.cardBg,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  iconCircle: {
    marginBottom: 10,
  },
  cardText: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 14,
    color: LANDING.sectionTitle,
    textAlign: 'center',
  },
});
