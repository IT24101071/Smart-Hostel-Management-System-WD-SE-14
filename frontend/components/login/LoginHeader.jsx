import { StyleSheet, Text, View } from 'react-native';
import SmartHostelLogo from '../SmartHostelLogo';

export default function LoginHeader() {
  return (
    <View style={styles.container}>
      <SmartHostelLogo width={100} height={100} />
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Welcome to the future of student living</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 36,
    paddingHorizontal: 28,
    paddingBottom: 28,
  },
  title: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 28,
    color: '#1C1B1F',
    marginTop: 20,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 14,
    color: '#6B7280',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },
});
