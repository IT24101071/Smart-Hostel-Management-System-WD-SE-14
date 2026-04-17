import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../../constants/colors';

export default function StudentSupportScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.inner}>
        <Ionicons name="chatbubble-outline" size={48} color={COLORS.primary} />
        <Text style={styles.title}>Support</Text>
        <Text style={styles.body}>
          Get help from hostel staff. Chat and tickets will be available here.
        </Text>
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
  },
});
