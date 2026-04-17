import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LANDING } from './landingTheme';

export default function LandingContactForm({
  initialName = '',
  initialNameEditable = true,
}) {
  const [name, setName] = useState(initialName ?? '');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setName(initialName ?? '');
  }, [initialName]);

  function handleSend() {
    const n = name.trim();
    const m = message.trim();
    if (!n) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }
    if (!m) {
      Alert.alert('Message required', 'Please enter a message.');
      return;
    }
    Alert.alert('Thank you', 'We received your message and will get back to you soon.');
    setName(initialName ?? '');
    setMessage('');
  }

  return (
    <View style={styles.section}>
      <View style={styles.card}>
        <Text style={styles.title}>Contact Us</Text>
        <Text style={styles.label}>NAME</Text>
        <TextInput
          style={[
            styles.input,
            !initialNameEditable && styles.inputNameLocked,
          ]}
          placeholder={initialNameEditable ? 'Enter your name' : ''}
          placeholderTextColor="#9CA3AF"
          value={name}
          onChangeText={setName}
          editable={initialNameEditable}
        />
        <Text style={styles.label}>MESSAGE</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="How can we help?"
          placeholderTextColor="#9CA3AF"
          value={message}
          onChangeText={setMessage}
          multiline
          textAlignVertical="top"
        />
        <Pressable style={styles.btn} onPress={handleSend}>
          <Text style={styles.btnText}>Send Message</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  card: {
    backgroundColor: LANDING.cardBg,
    borderRadius: 14,
    padding: 16,
  },
  title: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 18,
    color: LANDING.sectionTitle,
    marginBottom: 16,
  },
  label: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    fontFamily: 'PublicSans_400Regular',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: LANDING.sectionTitle,
    marginBottom: 14,
  },
  inputNameLocked: {
    backgroundColor: '#E5E7EB',
    color: LANDING.sectionTitle,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  btn: {
    backgroundColor: LANDING.accent,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  btnText: {
    fontFamily: 'PublicSans_600SemiBold',
    color: '#FFFFFF',
    fontSize: 15,
  },
});
