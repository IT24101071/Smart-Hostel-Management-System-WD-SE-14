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
import LandingContactForm from '../components/landing/LandingContactForm';
import LandingFeatureGrid from '../components/landing/LandingFeatureGrid';
import LandingFooter from '../components/landing/LandingFooter';
import LandingHero from '../components/landing/LandingHero';
import LandingMapSection from '../components/landing/LandingMapSection';
import LandingNavbar from '../components/landing/LandingNavbar';
import LandingRoomCard from '../components/landing/LandingRoomCard';
import { LANDING } from '../components/landing/landingTheme';
import { getRooms, getRoomErrorMessage } from '../services/room.service';

export default function LandingScreen() {
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const goLogin = useCallback(() => {
    router.push('/login');
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { rooms: list } = await getRooms({
          limit: 100,
          availabilityStatus: 'Available',
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

  return (
    <View style={styles.screenRoot}>
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <LandingNavbar onLogin={goLogin} />
      <LandingHero onReserve={goLogin} />
      <LandingFeatureGrid />

      <View style={styles.roomsSection}>
        <Text style={styles.sectionTitle}>Select Your Space</Text>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={LANDING.accent} />
            <Text style={[styles.muted, styles.loadingText]}>Loading rooms…</Text>
          </View>
        ) : error ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{error}</Text>
            <Text style={styles.mutedHint}>
              You can still sign in to explore the app.
            </Text>
          </View>
        ) : rooms.length === 0 ? (
          <Text style={styles.muted}>
            No rooms available at the moment. Check back soon.
          </Text>
        ) : (
          rooms.map((room) => (
            <LandingRoomCard key={room.id} room={room} onBookNow={goLogin} />
          ))
        )}

        {!loading && (
          <Pressable style={styles.seeMore} onPress={goLogin}>
            <Text style={styles.seeMoreText}>See more…</Text>
          </Pressable>
        )}
      </View>

      <LandingMapSection />
      <LandingContactForm />
      <LandingFooter />
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: '#C8DAEA',
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  bannerText: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 14,
    color: '#FCA5A5',
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
