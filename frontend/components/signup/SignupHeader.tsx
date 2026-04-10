import { StyleSheet, Text, View } from 'react-native';
import SmartHostelLogo from '../SmartHostelLogo';

export default function SignupHeader() {
  return (
    <View style={styles.container}>
      <SmartHostelLogo width={160} height={30} />
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Enter Your Details And Verify Your Status</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 36,
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
  title: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 26,
    color: '#1C1B1F',
    marginTop: 18,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 13.5,
    color: '#6B7280',
    marginTop: 5,
    textAlign: 'center',
    lineHeight: 20,
  },
});
