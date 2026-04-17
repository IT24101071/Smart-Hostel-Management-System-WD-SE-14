import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

export default function LandingFooter() {
  function placeholder(title) {
    return () => {
      Alert.alert(title, 'Coming soon.');
    };
  }

  return (
    <View style={styles.footer}>
      <Text style={styles.brand}>Smart Hostel</Text>
      <View style={styles.links}>
        <Pressable onPress={placeholder('Privacy')}>
          <Text style={styles.link}>Privacy</Text>
        </Pressable>
        <Text style={styles.dot}> · </Text>
        <Pressable onPress={placeholder('Terms')}>
          <Text style={styles.link}>Terms</Text>
        </Pressable>
        <Text style={styles.dot}> · </Text>
        <Pressable onPress={placeholder('Contact')}>
          <Text style={styles.link}>Contact</Text>
        </Pressable>
      </View>
      <Text style={styles.copy}>© 2024 Smart Hostel</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: '#000000',
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  brand: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 22,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  links: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 16,
  },
  link: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 14,
    color: '#E5E7EB',
  },
  dot: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  copy: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 12,
    color: '#9CA3AF',
  },
});
