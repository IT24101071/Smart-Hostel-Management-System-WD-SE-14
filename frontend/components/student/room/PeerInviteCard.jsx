import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { COLORS } from '../../../constants/colors';

function emptyPeerValues(count) {
  return Array.from({ length: count }, () => '');
}

export default function PeerInviteCard({ capacity, onInviteSent, onPeersChange }) {
  const peerFieldCount = Math.max(0, Number(capacity) - 1);
  const [peers, setPeers] = useState(() => emptyPeerValues(peerFieldCount));
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setPeers(emptyPeerValues(peerFieldCount));
  }, [peerFieldCount]);

  useEffect(() => {
    onPeersChange?.(peers.map((p) => p.trim()).filter(Boolean));
  }, [peers, onPeersChange]);

  const subtitle = useMemo(() => {
    if (peerFieldCount <= 1) {
      return 'You can invite one peer to sync your bookings.';
    }
    if (peerFieldCount === 2) {
      return 'You can invite up to two peers to sync your bookings.';
    }
    return `You can invite up to ${peerFieldCount} peers to sync your bookings.`;
  }, [peerFieldCount]);

  function setPeerAt(index, text) {
    setPeers((prev) => {
      const next = [...prev];
      next[index] = text;
      return next;
    });
  }

  async function handleSend() {
    if (sending) return;
    const cleanPeers = peers.map((p) => p.trim()).filter(Boolean);
    if (cleanPeers.length !== peerFieldCount) {
      Alert.alert(
        'Missing peer details',
        `Please enter ${peerFieldCount} peer contact(s) before sending invites.`,
      );
      return;
    }
    setSending(true);
    try {
      await onInviteSent?.(cleanPeers);
      Alert.alert('Invites sent', 'Your peers have been notified in the app.');
    } catch (e) {
      Alert.alert('Invite failed', e?.message || 'Could not send invites.');
    } finally {
      setSending(false);
    }
  }

  if (peerFieldCount < 1) {
    return null;
  }

  return (
    <LinearGradient
      colors={['#070F1C', '#163E7A']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.card}
    >
      <Text style={styles.title}>Reserve With A Peer</Text>
      <Text style={styles.sub}>{subtitle}</Text>
      <View style={styles.inputsBlock}>
        {peers.map((value, index) => (
          <View key={`peer-${index}`} style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Student ID or University Email"
              placeholderTextColor="rgba(255,255,255,0.55)"
              value={value}
              onChangeText={(text) => setPeerAt(index, text)}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel={`Peer ${index + 1}, student ID or university email`}
            />
            <Pressable
              onPress={handleSend}
              style={styles.sendBtn}
              accessibilityLabel={`Send invite for peer ${index + 1}`}
            >
              <Ionicons name="send" size={18} color={COLORS.white} />
            </Pressable>
          </View>
        ))}
      </View>
      <Pressable style={styles.cta} onPress={handleSend}>
        <Text style={styles.ctaText}>{sending ? 'Sending...' : 'Send Invite'}</Text>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 18,
    color: COLORS.white,
    marginBottom: 8,
  },
  sub: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 19,
    marginBottom: 16,
  },
  inputsBlock: {
    gap: 12,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    paddingLeft: 12,
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
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 15,
    color: COLORS.white,
  },
});
