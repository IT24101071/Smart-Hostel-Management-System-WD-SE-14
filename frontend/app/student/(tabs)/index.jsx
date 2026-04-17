import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import LandingContactForm from '../../../components/landing/LandingContactForm';
import LandingFeatureGrid from '../../../components/landing/LandingFeatureGrid';
import LandingHero from '../../../components/landing/LandingHero';
import LandingMapSection from '../../../components/landing/LandingMapSection';
import LandingRoomCard from '../../../components/landing/LandingRoomCard';
import { LANDING } from '../../../components/landing/landingTheme';
import StudentTopBar from '../../../components/student/StudentTopBar';
import { COLORS } from '../../../constants/colors';
import { storage } from '../../../lib/storage';
import { getRooms, getRoomErrorMessage } from '../../../services/room.service';

export default function StudentHomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roomsError, setRoomsError] = useState(null);

  const goBooking = useCallback(() => {
    router.push('/student/booking');
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const userData = await storage.getUser();
      if (!cancelled) setUser(userData);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setRoomsError(null);
      try {
        const { rooms: list } = await getRooms({
          limit: 100,
          availabilityStatus: 'Available',
        });
        if (!cancelled) setRooms(list);
      } catch (e) {
        if (!cancelled) setRoomsError(getRoomErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    await storage.clear();
    router.replace('/');
  }

  return (
    <View style={styles.screenRoot}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <StudentTopBar userName={user?.name} onLogout={handleLogout} />
        <LandingHero onReserve={goBooking} />
        <LandingFeatureGrid />

        <View style={styles.roomsSection}>
          <Text style={styles.sectionTitle}>Select Your Space</Text>
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={LANDING.accent} />
              <Text style={[styles.muted, styles.loadingText]}>
                Loading rooms…
              </Text>
            </View>
          ) : roomsError ? (
            <View style={styles.banner}>
              <Text style={styles.bannerText}>{roomsError}</Text>
              <Text style={styles.mutedHint}>
                Pull to try again or visit Booking to continue.
              </Text>
            </View>
          ) : rooms.length === 0 ? (
            <Text style={styles.muted}>
              No rooms available at the moment. Check back soon.
            </Text>
          ) : (
            rooms.map((room) => (
              <LandingRoomCard
                key={room.id}
                room={room}
                onBookNow={goBooking}
              />
            ))
          )}

          {!loading && (
            <Pressable style={styles.seeMore} onPress={goBooking}>
              <Text style={styles.seeMoreText}>See more…</Text>
            </Pressable>
          )}
        </View>

        <LandingMapSection />
        <LandingContactForm
          initialName={user?.name ?? ''}
          initialNameEditable={false}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: LANDING.pageBg,
  },
  scroll: {
    flex: 1,
    backgroundColor: LANDING.pageBg,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 32,
    backgroundColor: LANDING.pageBg,
  },
  roomsSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 20,
    color: LANDING.sectionTitle,
    marginBottom: 14,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  muted: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 14,
    color: LANDING.textMuted,
    textAlign: 'center',
    marginBottom: 8,
  },
  loadingText: {
    marginTop: 12,
  },
  mutedHint: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 13,
    color: LANDING.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  banner: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  bannerText: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 14,
    color: COLORS.maintenance,
    textAlign: 'center',
  },
  seeMore: {
    marginTop: 8,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: LANDING.accent,
    borderRadius: 20,
  },
  seeMoreText: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 14,
    color: LANDING.accent,
  },
});
