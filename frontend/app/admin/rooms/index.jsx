import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader, { HeaderIconButton } from '../../../components/rooms/ScreenHeader';
import RoomCard from '../../../components/rooms/RoomCard';
import RoomFilterTabs from '../../../components/rooms/RoomFilterTabs';
import RoomStatsBar from '../../../components/rooms/RoomStatsBar';
import { COLORS } from '../../../constants/colors';
import { deleteRoom, getRoomErrorMessage, getRooms } from '../../../services/room.service';

export default function RoomsScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('All');
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchRooms = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const { rooms: fetched } = await getRooms({ limit: 100 });
      setRooms(fetched);
    } catch (err) {
      setError(getRoomErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  function onRefresh() {
    setRefreshing(true);
    fetchRooms(true);
  }

  const filteredRooms =
    activeFilter === 'All'
      ? rooms
      : rooms.filter((r) => r.availabilityStatus === activeFilter);

  function handleDelete(room) {
    Alert.alert(
      'Delete Room',
      `Are you sure you want to delete Room ${room.roomNumber}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRoom(room.id);
              setRooms((prev) => prev.filter((r) => r.id !== room.id));
            } catch (err) {
              Alert.alert('Error', getRoomErrorMessage(err));
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <ScreenHeader
        title="Room Management"
        onBack={() => router.back()}
        rightElement={
          <HeaderIconButton icon="add" onPress={() => router.push('/admin/rooms/create')} />
        }
      />

      {/* Stats always shows the full unfiltered count */}
      <RoomStatsBar rooms={rooms} />
      <RoomFilterTabs activeFilter={activeFilter} onChange={setActiveFilter} />

      {loading ? (
        <View style={styles.centeredBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading rooms…</Text>
        </View>
      ) : error ? (
        <View style={styles.centeredBox}>
          <Ionicons name="cloud-offline-outline" size={48} color="#D1D5DB" />
          <Text style={styles.errorTitle}>Failed to load rooms</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => fetchRooms()}>
            <Ionicons name="refresh-outline" size={16} color={COLORS.white} />
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >
          {filteredRooms.length === 0 ? (
            <EmptyState filter={activeFilter} onAdd={() => router.push('/admin/rooms/create')} />
          ) : (
            filteredRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                onView={() => router.push(`/admin/rooms/${room.id}`)}
                onEdit={() => router.push(`/admin/rooms/${room.id}/edit`)}
                onDelete={() => handleDelete(room)}
              />
            ))
          )}
        </ScrollView>
      )}

      <Pressable style={styles.fab} onPress={() => router.push('/admin/rooms/create')}>
        <Ionicons name="add" size={26} color={COLORS.white} />
      </Pressable>
    </SafeAreaView>
  );
}

function EmptyState({ filter, onAdd }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="bed-outline" size={56} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No rooms found</Text>
      <Text style={styles.emptySubtitle}>
        {filter === 'All'
          ? 'Add your first room to get started.'
          : `No rooms with status "${filter}".`}
      </Text>
      {filter === 'All' && (
        <Pressable style={styles.emptyAddButton} onPress={onAdd}>
          <Ionicons name="add" size={16} color={COLORS.white} />
          <Text style={styles.emptyAddText}>Add Room</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 100,
  },

  // Loading / error states
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 17,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  emptySubtitle: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 8,
  },
  emptyAddText: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 14,
    color: COLORS.white,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
});
