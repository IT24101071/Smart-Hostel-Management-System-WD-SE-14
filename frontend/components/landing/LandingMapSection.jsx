import { useAssets } from 'expo-asset';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { LANDING } from './landingTheme';

export default function LandingMapSection() {
  const [assets] = useAssets([require('../../assets/images/landing-map.svg')]);
  const [cardWidth, setCardWidth] = useState(0);
  const uri = assets?.[0]?.localUri ?? null;

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Find Your Way</Text>
      <View style={styles.card} onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}>
        {uri && cardWidth > 0 && (
          <SvgUri
            uri={uri}
            width={cardWidth}
            height={220}
            preserveAspectRatio="xMidYMid meet"
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  heading: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 20,
    color: LANDING.sectionTitle,
    marginBottom: 12,
  },
  card: {
    backgroundColor: LANDING.cardBg,
    borderRadius: 14,
    overflow: 'hidden',
    minHeight: 200,
  },
});
