import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../../constants/colors';

export default function StudentBookingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.inner}>
        <Ionicons name="calendar-outline" size={48} color={COLORS.primary} />
        <Text style={styles.title}>Booking</Text>
        <Text style={styles.body}>
          Reserve or manage your hostel room. Full booking flow will appear here.
        </Text>
        <Pressable
          style={styles.link}
          onPress={() => router.push('/student')}
        >
          <Text style={styles.linkText}>Browse available rooms on Home</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.studentScreenBackground,
  },
  inner: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 22,
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  body: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  link: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  linkText: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 15,
    color: COLORS.primary,
  },
});
