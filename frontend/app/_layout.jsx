import {
  PublicSans_400Regular,
  PublicSans_500Medium,
  PublicSans_600SemiBold,
  PublicSans_700Bold,
  useFonts,
} from '@expo-google-fonts/public-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SafeScreen from '../components/safeScreen/SafeScreen';
import { useEffect } from 'react';
import { Platform, StatusBar } from 'react-native';
import { COLORS } from '../constants/colors';

SplashScreen.preventAutoHideAsync();

function AppNavigation() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          flex: 1,
          backgroundColor: COLORS.studentScreenBackground,
        },
      }}
    >
      <Stack.Screen name="admin" />
      <Stack.Screen name="staff" />
      <Stack.Screen name="(auth)" />
    </Stack>
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
      <StatusBar
        barStyle="dark-content"
        translucent={Platform.OS === 'android' ? false : undefined}
        backgroundColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
      />
      <SafeScreen>
        <AppNavigation />
      </SafeScreen>
    </SafeAreaProvider>
  );
}
