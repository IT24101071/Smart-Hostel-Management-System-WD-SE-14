import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RoomForm from '../../../../components/rooms/RoomForm';
import ScreenHeader from '../../../../components/rooms/ScreenHeader';
import { COLORS } from '../../../../constants/colors';
import {
  getRoomById,
  getRoomErrorMessage,
  updateRoom,
} from '../../../../services/room.service';
import { Room, RoomFormValues } from '../../../../types/room';

function roomToFormValues(room: Room): RoomFormValues {
  return {
    roomNumber: room.roomNumber,
    roomType: room.roomType,
    pricePerMonth: String(room.pricePerMonth),
    capacity: room.capacity,
    description: room.description ?? '',
    availabilityStatus: room.availabilityStatus,
    imageUris: [], // start empty; new picks are appended to existing backend images
  };
}

export default function EditRoomScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      setFetchError('');
      try {
        const data = await getRoomById(id!);
        setRoom(data);
      } catch (err) {
        setFetchError(getRoomErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    if (id) fetch();
  }, [id]);

  async function handleSubmit(values: RoomFormValues) {
    setApiError('');
    setSubmitting(true);
    try {
      const updated = await updateRoom(id!, values);
      Alert.alert('Success', `Room ${updated.roomNumber} has been updated successfully.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      setApiError(getRoomErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <ScreenHeader title="Edit Room" onBack={() => router.back()} />
        <View style={styles.centeredBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading room data…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Fetch error ──────────────────────────────────────────────────
  if (fetchError || !room) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <ScreenHeader title="Edit Room" onBack={() => router.back()} />
        <View style={styles.centeredBox}>
          <Ionicons name="cloud-offline-outline" size={48} color="#D1D5DB" />
          <Text style={styles.errorTitle}>Failed to load room</Text>
          <Text style={styles.errorSubtitle}>{fetchError}</Text>
          <Pressable style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <ScreenHeader
        title="Edit Room"
        subtitle={`Room ${room.roomNumber}`}
        onBack={() => router.back()}
      />

      {/* Edit notice */}
      <View style={styles.notice}>
        <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
        <Text style={styles.noticeText}>
          Capacity cannot be set below current occupancy ({room.currentOccupancy} occupied).
        </Text>
      </View>

      {/* API error banner */}
      {apiError !== '' && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color={COLORS.maintenance} />
          <Text style={styles.errorText}>{apiError}</Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <RoomForm
            initialValues={roomToFormValues(room)}
            submitLabel={submitting ? 'Saving…' : 'Save Changes'}
            submitting={submitting}
            onCancel={() => router.back()}
            onSubmit={handleSubmit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  centeredBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  loadingText: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  errorTitle: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  errorSubtitle: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 8,
  },
  retryText: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 14,
    color: COLORS.white,
  },

  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
  },
  noticeText: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 12.5,
    color: COLORS.primary,
    flex: 1,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.maintenanceBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.maintenanceBorder,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorText: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 13,
    color: COLORS.maintenance,
    flex: 1,
  },
});
