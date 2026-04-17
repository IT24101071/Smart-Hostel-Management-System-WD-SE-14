import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LANDING } from './landingTheme';

const heroSource = require('../../assets/images/landing-hero.svg');

export default function LandingHero({ onReserve }) {
  return (
    <View style={styles.wrap}>
      <Image
        source={heroSource}
        style={styles.image}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.overlay}>
        <Text style={styles.title}>Experience Smart Living</Text>
        <Pressable style={styles.cta} onPress={onReserve}>
          <Text style={styles.ctaText}>Reserve Your Room</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    margin: 20,
    height: 280,
    borderRadius: 20,
    overflow: 'hidden',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    /** Dims the hero image so text stays readable and the scene looks less bright */
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 26,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  cta: {
    backgroundColor: LANDING.accent,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  ctaText: {
    fontFamily: 'PublicSans_600SemiBold',
    color: '#FFFFFF',
    fontSize: 15,
  },
});
