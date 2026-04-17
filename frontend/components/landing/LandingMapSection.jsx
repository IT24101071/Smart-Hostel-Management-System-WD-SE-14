import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { LANDING } from './landingTheme';

const mapSource = require('../../assets/images/landing-map.svg');

export default function LandingMapSection() {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Find Your Way</Text>
      <View style={styles.card}>
        <Image
          source={mapSource}
          style={styles.map}
          contentFit="contain"
          transition={200}
        />
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
  map: {
    width: '100%',
    height: 220,
  },
});
