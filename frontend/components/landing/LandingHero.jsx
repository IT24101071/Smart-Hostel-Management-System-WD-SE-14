import { useAssets } from 'expo-asset';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { LANDING } from './landingTheme';

export default function LandingHero({ onReserve }) {
  const [assets] = useAssets([require('../../assets/images/landing-hero.svg')]);
  const [cardWidth, setCardWidth] = useState(0);
  const uri = assets?.[0]?.localUri ?? null;

  return (
    <View style={styles.shadowWrap}>
      <View style={styles.card} onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}>
        {uri && cardWidth > 0 && (
          <SvgUri
            uri={uri}
            width={cardWidth}
            height={280}
            preserveAspectRatio="xMidYMid slice"
            style={StyleSheet.absoluteFillObject}
          />
        )}
        <View style={styles.overlay}>
          <Text style={styles.title}>Experience Smart Living</Text>
          <Pressable style={styles.cta} onPress={onReserve}>
            <Text style={styles.ctaText}>Reserve Your Room</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /** Shadow lives outside the clipped card so iOS does not clip it; width matches the hero image/card. */
  shadowWrap: {
    margin: 20,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 5,
  },
  card: {
    height: 280,
    borderRadius: 20,
    overflow: 'hidden',
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
