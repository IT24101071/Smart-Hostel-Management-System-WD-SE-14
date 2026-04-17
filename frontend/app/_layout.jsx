import {
  PublicSans_400Regular,
  PublicSans_500Medium,
  PublicSans_600SemiBold,
  PublicSans_700Bold,
  useFonts,
} from '@expo-google-fonts/public-sans';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import SafeScreen from '../components/safeScreen/SafeScreen';
import { useEffect } from 'react';
import { COLORS } from '../constants/colors';

SplashScreen.preventAutoHideAsync();

function AppNavigation() {
  const pathname = usePathname();
  const isLanding = !pathname || pathname === '/';
  const isStudentRoute = pathname?.startsWith('/student');
  const stackBg = isLanding || isStudentRoute
    ? COLORS.studentScreenBackground
    : '#FFFFFF';
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            flex: 1,
            backgroundColor: stackBg,
          },
        }}
      >
        <Stack.Screen name="admin" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    PublicSans_400Regular,
    PublicSans_500Medium,
    PublicSans_600SemiBold,
    PublicSans_700Bold,
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <SafeScreen>
        <AppNavigation />
      </SafeScreen>
    </SafeAreaProvider>
  );
}
