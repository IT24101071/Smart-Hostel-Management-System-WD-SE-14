import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { COLORS } from '../../constants/colors';

const YEARS = ['1', '2', '3', '4'];
const SEMESTERS = ['1', '2'];

export default function SignupForm() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [year, setYear] = useState('2');
  const [semester, setSemester] = useState('2');
  const [contactNo, setContactNo] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [guardianName, setGuardianName] = useState('');
  const [guardianContact, setGuardianContact] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [semesterOpen, setSemesterOpen] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Create Account</Text>

      {/* Profile Picture */}
      <View style={styles.avatarWrapper}>
        <Pressable style={styles.avatarUpload}>
          <Ionicons name="cloud-upload-outline" size={26} color="#9CA3AF" />
          <Text style={styles.avatarUploadText}>Upload Profile Picture</Text>
        </Pressable>
      </View>

      {/* Full Name */}
      <FieldGroup label="Full Name">
        <InputRow icon="person-outline" placeholder="John Doe" value={fullName} onChangeText={setFullName} />
      </FieldGroup>

      {/* University Email */}
      <FieldGroup label="University Email">
        <InputRow
          icon="mail-outline"
          placeholder="it24xxxxxx@my.sliit.lk"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </FieldGroup>

      {/* Student ID + Upload */}
      <FieldGroup label="Student ID">
        <View style={styles.splitRow}>
          <View style={[styles.inputRow, styles.splitInput]}>
            <Ionicons name="id-card-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="IT2xxxxxxx"
              placeholderTextColor="#9CA3AF"
              value={studentId}
              onChangeText={setStudentId}
              autoCapitalize="characters"
            />
          </View>
          <Pressable style={styles.uploadIdButton}>
            <Ionicons name="cloud-upload-outline" size={15} color={COLORS.primary} />
            <Text style={styles.uploadIdText}>Upload ID</Text>
          </Pressable>
        </View>
      </FieldGroup>

      {/* Year + Semester */}
      <View style={styles.twoColumnRow}>
        <View style={styles.column}>
          <Text style={styles.fieldLabel}>Year</Text>
          <Pressable
            style={styles.selectButton}
            onPress={() => { setYearOpen((v) => !v); setSemesterOpen(false); }}
          >
            <Text style={styles.selectValue}>{year}</Text>
            <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
          </Pressable>
          {yearOpen && (
            <View style={styles.dropdown}>
              {YEARS.map((y) => (
                <Pressable
                  key={y}
                  style={[styles.dropdownItem, year === y && styles.dropdownItemActive]}
                  onPress={() => { setYear(y); setYearOpen(false); }}
                >
                  <Text style={[styles.dropdownText, year === y && styles.dropdownTextActive]}>
                    {y}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.column}>
          <Text style={styles.fieldLabel}>Semester</Text>
          <Pressable
            style={styles.selectButton}
            onPress={() => { setSemesterOpen((v) => !v); setYearOpen(false); }}
          >
            <Text style={styles.selectValue}>{semester}</Text>
            <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
          </Pressable>
          {semesterOpen && (
            <View style={styles.dropdown}>
              {SEMESTERS.map((s) => (
                <Pressable
                  key={s}
                  style={[styles.dropdownItem, semester === s && styles.dropdownItemActive]}
                  onPress={() => { setSemester(s); setSemesterOpen(false); }}
                >
                  <Text style={[styles.dropdownText, semester === s && styles.dropdownTextActive]}>
                    {s}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Contact No */}
      <FieldGroup label="Contact No">
        <InputRow
          icon="call-outline"
          placeholder="077xxxxxxx"
          value={contactNo}
          onChangeText={setContactNo}
          keyboardType="phone-pad"
        />
      </FieldGroup>

      {/* Password */}
      <FieldGroup label="Password">
        <View style={styles.inputRow}>
          <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="••••••••••••••••"
            placeholderTextColor="#9CA3AF"
            secureTextEntry={!passwordVisible}
            autoCapitalize="none"
            autoCorrect={false}
            value={password}
            onChangeText={setPassword}
          />
          <Pressable onPress={() => setPasswordVisible((v) => !v)} style={styles.eyeButton} hitSlop={8}>
            <Ionicons name={passwordVisible ? 'eye-outline' : 'eye-off-outline'} size={20} color="#9CA3AF" />
          </Pressable>
        </View>
      </FieldGroup>

      {/* Guardian / Emergency Contact Divider */}
      <View style={styles.dividerSection}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerLabel}>Guardian / Emergency Contact</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Guardian Name */}
      <FieldGroup label="Guardian Name">
        <InputRow icon="person-outline" placeholder="John Doe" value={guardianName} onChangeText={setGuardianName} />
      </FieldGroup>

      {/* Guardian Contact */}
      <FieldGroup label="Contact No">
        <InputRow
          icon="call-outline"
          placeholder="077xxxxxxx"
          value={guardianContact}
          onChangeText={setGuardianContact}
          keyboardType="phone-pad"
        />
      </FieldGroup>

      {/* Terms */}
      <Pressable style={styles.termsRow} onPress={() => setAgreedToTerms((v) => !v)}>
        <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
          {agreedToTerms && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
        </View>
        <Text style={styles.termsText}>
          {'I agree to the '}
          <Text style={styles.termsLink}>Terms & Privacy Policy</Text>
          {' of Smart Hostel'}
        </Text>
      </Pressable>

      {/* Submit */}
      <Pressable
        style={({ pressed }) => [styles.submitButton, pressed && styles.submitButtonPressed]}
      >
        <Text style={styles.submitButtonText}>Create Account</Text>
      </Pressable>
    </View>
  );
}

/* ─── Small helper components ─────────────────────────────────── */

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function InputRow({
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View style={styles.inputRow}>
      <Ionicons name={icon} size={18} color="#9CA3AF" style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'words'}
        autoCorrect={false}
      />
    </View>
  );
}

/* ─── Styles ───────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  sectionTitle: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 18,
    color: '#1C1B1F',
    marginBottom: 20,
  },

  // Avatar upload
  avatarWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarUpload: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  avatarUploadText: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 9,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 6,
  },

  // Field group
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 13.5,
    color: '#374151',
    marginBottom: 6,
  },

  // Input row
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 46,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: 'PublicSans_400Regular',
    fontSize: 14,
    color: '#1C1B1F',
    height: '100%',
  },
  passwordInput: {
    letterSpacing: 1,
  },
  eyeButton: {
    padding: 4,
  },

  // Student ID split row
  splitRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  splitInput: {
    flex: 1,
  },
  uploadIdButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  uploadIdText: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 13,
    color: COLORS.primary,
  },

  // Year / Semester two-column
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  column: {
    flex: 1,
    position: 'relative',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    height: 46,
  },
  selectValue: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 14,
    color: '#1C1B1F',
  },
  dropdown: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  dropdownItemActive: {
    backgroundColor: COLORS.primaryLight,
  },
  dropdownText: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 14,
    color: '#374151',
  },
  dropdownTextActive: {
    color: COLORS.primary,
    fontFamily: 'PublicSans_600SemiBold',
  },

  // Guardian divider
  dividerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    marginTop: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerLabel: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 12,
    color: '#6B7280',
  },

  // Terms
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 20,
    marginTop: 4,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  termsText: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 13,
    color: '#374151',
    flex: 1,
    lineHeight: 20,
  },
  termsLink: {
    fontFamily: 'PublicSans_600SemiBold',
    color: COLORS.primary,
  },

  // Submit
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonPressed: {
    backgroundColor: COLORS.primaryDark,
    opacity: 0.95,
  },
  submitButtonText: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
