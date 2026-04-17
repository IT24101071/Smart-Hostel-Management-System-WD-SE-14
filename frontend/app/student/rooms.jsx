import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LandingRoomCard from '../../components/landing/LandingRoomCard';
import { LANDING } from '../../components/landing/landingTheme';
import { COLORS } from '../../constants/colors';
import { getRooms, getRoomErrorMessage } from '../../services/room.service';

const BED_FILTERS = [
  { value: null, label: 'All beds' },
  { value: 1, label: '1 bed' },
  { value: 2, label: '2 beds' },
  { value: 3, label: '3 beds' },
];

const TYPE_FILTERS = [
  { value: null, label: 'All types' },
  { value: 'Single', label: 'Single' },
  { value: 'Double', label: 'Double' },
  { value: 'Triple', label: 'Triple' },
];

const AVAILABILITY_FILTERS = [
  { value: null, label: 'All statuses' },
  { value: 'Available', label: 'Available' },
  { value: 'Full', label: 'Full' },
  { value: 'Maintenance', label: 'Maintenance' },
];

function FilterChip({ label, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function StudentAllRoomsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bedsFilter, setBedsFilter] = useState(null);
  const [typeFilter, setTypeFilter] = useState(null);
  const [availabilityFilter, setAvailabilityFilter] = useState(null);

  const goRoomDetail = useCallback(
    (roomId) => {
      router.push(`/student/room/${roomId}`);
    },
    [router],
  );

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/student');
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { rooms: list } = await getRooms({
          limit: 100,
        });
        if (!cancelled) setRooms(list);
      } catch (e) {
        if (!cancelled) setError(getRoomErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (bedsFilter != null && Number(r.capacity) !== bedsFilter) return false;
      if (typeFilter != null && r.roomType !== typeFilter) return false;
      if (
        availabilityFilter != null &&
        r.availabilityStatus !== availabilityFilter
      ) {
        return false;
      }
      return true;
    });
  }, [rooms, bedsFilter, typeFilter, availabilityFilter]);

  const clearFilters = useCallback(() => {
    setBedsFilter(null);
    setTypeFilter(null);
    setAvailabilityFilter(null);
  }, []);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable
          style={styles.backBtn}
          onPress={handleBack}
          hitSlop={12}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.title}>All rooms</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 32 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>Available spaces you can book</Text>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={LANDING.accent} />
            <Text style={styles.muted}>Loading rooms…</Text>
          </View>
        ) : error ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{error}</Text>
          </View>
        ) : rooms.length === 0 ? (
          <Text style={styles.muted}>No rooms available right now.</Text>
        ) : (
          <>
            <View style={styles.filtersCard}>
              <Text style={styles.filtersTitle}>Filter by</Text>

              <Text style={styles.filterGroupLabel}>Beds</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterChipsRow}
                nestedScrollEnabled
              >
                {BED_FILTERS.map((opt) => (
                  <FilterChip
                    key={String(opt.value)}
                    label={opt.label}
                    selected={bedsFilter === opt.value}
                    onPress={() => setBedsFilter(opt.value)}
                  />
                ))}
              </ScrollView>

              <Text style={[styles.filterGroupLabel, styles.filterGroupSpacer]}>
                Room type
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterChipsRow}
                nestedScrollEnabled
              >
                {TYPE_FILTERS.map((opt) => (
                  <FilterChip
                    key={String(opt.value)}
                    label={opt.label}
                    selected={typeFilter === opt.value}
                    onPress={() => setTypeFilter(opt.value)}
                  />
                ))}
              </ScrollView>

              <Text style={[styles.filterGroupLabel, styles.filterGroupSpacer]}>
                Availability
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterChipsRow}
                nestedScrollEnabled
              >
                {AVAILABILITY_FILTERS.map((opt) => (
                  <FilterChip
                    key={String(opt.value)}
                    label={opt.label}
                    selected={availabilityFilter === opt.value}
                    onPress={() => setAvailabilityFilter(opt.value)}
                  />
                ))}
              </ScrollView>

              {(bedsFilter != null ||
                typeFilter != null ||
                availabilityFilter != null) && (
                <Pressable
                  onPress={clearFilters}
                  style={styles.clearFiltersBtn}
                  accessibilityLabel="Clear all filters"
                >
                  <Text style={styles.clearFiltersText}>Clear filters</Text>
                </Pressable>
              )}
            </View>

            {filteredRooms.length === 0 ? (
              <View style={styles.emptyFiltered}>
                <Text style={styles.muted}>
                  No rooms match these filters. Try different options or tap
                  Clear filters above.
                </Text>
              </View>
            ) : (
              filteredRooms.map((room) => (
                <LandingRoomCard
                  key={room.id}
                  room={room}
                  onBookNow={() => goRoomDetail(room.id)}
                />
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: LANDING.pageBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  headerSpacer: {
    width: 44,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  subtitle: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 14,
    color: '#000000',
    marginBottom: 16,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  muted: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 14,
    color: LANDING.textMuted,
    marginTop: 12,
    textAlign: 'center',
  },
  banner: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 12,
    padding: 14,
  },
  bannerText: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 14,
    color: COLORS.maintenance,
    textAlign: 'center',
  },
  filtersCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  filtersTitle: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 14,
    color: LANDING.sectionTitle,
    marginBottom: 12,
  },
  filterGroupLabel: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 12,
    color: LANDING.textMuted,
    marginBottom: 8,
  },
  filterGroupSpacer: {
    marginTop: 12,
  },
  filterChipsRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: LANDING.pageBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipSelected: {
    backgroundColor: LANDING.accent,
    borderColor: LANDING.accent,
  },
  chipText: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 13,
    color: LANDING.sectionTitle,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  clearFiltersBtn: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 4,
  },
  clearFiltersText: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 13,
    color: LANDING.accent,
  },
  emptyFiltered: {
    paddingVertical: 8,
  },
});
