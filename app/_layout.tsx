import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Quicksand_600SemiBold, Quicksand_700Bold } from '@expo-google-fonts/quicksand';
import { AuthProvider, useAuth } from '@/hooks/AuthProvider';
import { DataProvider } from '@/hooks/useData';
import { setupAndroidChannel } from '@/lib/notifications';
import { AnimatedSplash } from '@/components/AnimatedSplash';
import { colors, fonts } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Hand off from the native splash to the JS-side AnimatedSplash as soon as
// the JS bundle is parsed. The AnimatedSplash uses the same teal background,
// so the user sees a continuous teal screen — the paws and wordmark animate
// in via JS while auth resolves in the background.
const HANDOFF_MS = 100;
setTimeout(() => {
  SplashScreen.hideAsync().catch(() => {});
}, HANDOFF_MS);

function RootNav() {
  const { user, initializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [splashUnmounted, setSplashUnmounted] = useState(false);
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
  });

  useEffect(() => {
    if (initializing) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!user && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, initializing, segments]);

  return (
    <>
      {/* Both splash and app backgrounds are warm/light now — dark status bar
          icons work for both states. */}
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTitleStyle: fontsLoaded
            ? { fontFamily: fonts.display.bold }
            : { fontWeight: '700' },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
          // Show only the back chevron, no text. Without this, iOS falls
          // back to the previous route's title — which for screens pushed
          // from the tab navigator surfaces as the literal "(tabs)" group
          // name. `minimal` matches what most native iOS apps do.
          headerBackTitle: 'Back',
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="pet/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="pet/add" options={{ title: 'Add a pet', presentation: 'modal' }} />
        <Stack.Screen name="pet/edit/[id]" options={{ title: 'Edit pet', presentation: 'modal' }} />
        <Stack.Screen name="pet/emergency/[id]" options={{ title: 'Emergency Card' }} />
        <Stack.Screen name="pet/summary/[id]" options={{ title: 'Monthly summary' }} />
        <Stack.Screen name="reminder/add" options={{ title: 'New reminder', presentation: 'modal' }} />
        <Stack.Screen name="medication/add" options={{ title: 'Add medication', presentation: 'modal' }} />
        <Stack.Screen name="medication/[id]" options={{ title: 'Medication' }} />
        <Stack.Screen name="vaccine/add" options={{ title: 'Add vaccine', presentation: 'modal' }} />
        <Stack.Screen name="vaccine/edit/[id]" options={{ title: 'Edit vaccine', presentation: 'modal' }} />
        <Stack.Screen name="vaccine/scan" options={{ title: 'Scan vaccine', presentation: 'modal' }} />
        <Stack.Screen name="invoice/scan" options={{ title: 'Scan vet invoice', presentation: 'modal' }} />
        <Stack.Screen name="document/scan" options={{ title: 'Scan Document', presentation: 'modal' }} />
        <Stack.Screen name="document/upload" options={{ title: 'Add document', presentation: 'modal' }} />
        <Stack.Screen name="document/[id]" options={{ title: 'Document' }} />
        <Stack.Screen name="paywall" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>

      {!splashUnmounted && (
        <AnimatedSplash
          // Hold the splash until BOTH auth has resolved AND custom fonts
          // are loaded — otherwise the first frame after dismiss flashes
          // system fonts before the Google fonts swap in.
          ready={!initializing && fontsLoaded}
          onHidden={() => setSplashUnmounted(true)}
        />
      )}
    </>
  );
}

export default function RootLayout() {
  useEffect(() => { setupAndroidChannel().catch(() => {}); }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <DataProvider>
            <RootNav />
          </DataProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
