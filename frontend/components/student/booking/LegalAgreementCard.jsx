import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../../constants/colors';

export default function LegalAgreementCard({ agreed, onToggle }) {
  return (
    <View>
      <Text style={styles.heading}>Legal Agreement</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Hostel Rules & Regulations</Text>
        <Text style={styles.rule}>
          Guest Policy: All visitors must be registered via the Visitor Log module
          24 hours in advance. Guests are not permitted in residential wings
          after 10:30 PM.
        </Text>
        <Text style={styles.rule}>
          Gate Timing: The main gate operates on an automated Smart Lock system.
          Emergency entry after 11:00 PM requires a Late Entry request approved by
          the Warden via the app.
        </Text>
        <Text style={styles.rule}>
          Modifications: No permanent changes (painting, drilling, or rewiring)
          are allowed.
        </Text>
        <Text style={styles.rule}>
          Quiet Hours: Strict quiet hours are enforced from 11:00 PM to 6:00 AM
          to support students' study schedules.
        </Text>

        <Pressable
          style={styles.checkboxRow}
          onPress={onToggle}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreed }}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed ? (
              <Ionicons name="checkmark" size={12} color={COLORS.white} />
            ) : null}
          </View>
          <Text style={styles.checkboxText}>I agree to these conditions</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 18,
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  cardTitle: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  rule: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  checkboxRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxText: {
    marginLeft: 8,
    fontFamily: 'PublicSans_400Regular',
    fontSize: 13,
    color: COLORS.textPrimary,
  },
});
