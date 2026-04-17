import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { COLORS } from '../../../constants/colors';

export default function PeerInviteCard() {
  const [peer, setPeer] = useState('');

  function handleSend() {
    Alert.alert(
      'Coming soon',
      'Peer booking invites will be available in a future update.',
    );
  }

  return (
    <LinearGradient
      colors={['#204F95', '#0A192F']}
      locations={[0.351, 0.7115]}
      start={{ x: 0.5, y: 1 }}
      end={{ x: 0.5, y: 0 }}
      style={styles.card}
    >
      <Text style={styles.title}>Reserve With A Peer</Text>
      <Text style={styles.sub}>
        You can invite one peer to sync your bookings.
      </Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Student ID or University Email"
          placeholderTextColor="rgba(255,255,255,0.55)"
          value={peer}
          onChangeText={setPeer}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable
          onPress={handleSend}
          style={styles.sendBtn}
          accessibilityLabel="Send invite"
        >
          <Ionicons name="send" size={18} color={COLORS.white} />
        </Pressable>
      </View>
      <Pressable style={styles.cta} onPress={handleSend}>
        <Text style={styles.ctaText}>Send Invite</Text>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 17,
    color: COLORS.white,
    marginBottom: 6,
  },
  sub: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 19,
    marginBottom: 14,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingLeft: 12,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontFamily: 'PublicSans_400Regular',
    fontSize: 14,
    color: COLORS.white,
    paddingVertical: 12,
    paddingRight: 8,
  },
  sendBtn: {
    padding: 12,
  },
  cta: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 15,
    color: COLORS.white,
  },
});
