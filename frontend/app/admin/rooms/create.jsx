import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import RoomForm from '../../../components/rooms/RoomForm';
import ScreenHeader from '../../../components/rooms/ScreenHeader';
import { COLORS } from '../../../constants/colors';
import { createRoom, getRoomErrorMessage } from '../../../services/room.service';

export default function CreateRoomScreen() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  async function handleSubmit(values) {
    setApiError('');
    setSubmitting(true);
    try {
      const room = await createRoom(values);
      Alert.alert('Success', `Room ${room.roomNumber} has been created successfully.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      setApiError(getRoomErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <ScreenHeader
        title="Add New Room"
        subtitle="Fill in the room details below"
        onBack={() => router.back()}
      />

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
            submitLabel={submitting ? 'Creating…' : 'Create Room'}
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
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
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
