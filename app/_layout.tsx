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
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { colors, fonts } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Hand off from the native splash to the JS-side AnimatedSplash as soon as
// the JS bundle is parsed. The AnimatedSplash uses the same teal background,
// so the user sees a continuous teal screen. The paws and wordmark animate
// in via JS while auth resolves in the background.
const HANDOFF_MS = 100;
setTimeout(() => {
  SplashScreen.hideAsync().catch(() => {});
}, HANDOFF_MS);

function RootNav() {
  const { user, profile, initializing } = useAuth();
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
    const inOnboarding = segments[0] === 'onboarding';
    if (!user && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
      return;
    }
    if (user && inAuthGroup) {
      router.replace('/(tabs)');
      return;
    }
    // First-time users (or anyone whose profile flag isn't true yet)
    // get the 4-step onboarding wizard before the tabs. Once they
    // finish (or skip), markOnboardingComplete flips the flag and the
    // detour stops firing on subsequent sign-ins.
    if (user && profile && !profile.onboardingCompleted && !inOnboarding && !inAuthGroup) {
      router.replace('/onboarding');
    }
  }, [user, profile, initializing, segments]);

  return (
    <>
      {/* Both splash and app backgrounds are warm/light now, so dark status bar
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
          // back to the previous route's title, which for screens pushed
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
        <Stack.Screen name="vaccine/add" options={{ title: 'Add vaccine record', presentation: 'modal' }} />
        <Stack.Screen name="vaccine/edit/[id]" options={{ title: 'Edit vaccine record', presentation: 'modal' }} />
        <Stack.Screen name="vaccine/scan" options={{ title: 'Scan vaccine', presentation: 'modal' }} />
        <Stack.Screen name="invoice/scan" options={{ title: 'Scan vet invoice', presentation: 'modal' }} />
        <Stack.Screen name="document/scan" options={{ title: 'Scan Document', presentation: 'modal' }} />
        <Stack.Screen name="document/upload" options={{ title: 'Add document', presentation: 'modal' }} />
        <Stack.Screen name="document/[id]" options={{ title: 'Document' }} />
        <Stack.Screen name="paywall" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="support/index" options={{ title: 'Support' }} />
        <Stack.Screen name="support/[id]" options={{ title: 'Ticket' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="data/export" options={{ title: 'Your data' }} />
        <Stack.Screen name="pet/share/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="pet/care/[id]" options={{ title: 'Care instructions', presentation: 'modal' }} />
        <Stack.Screen name="settings/notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="share/accept" options={{ presentation: 'modal' }} />
        <Stack.Screen name="share/manage" options={{ title: 'Manage people' }} />
        <Stack.Screen name="routines/[petId]" options={{ title: 'Routines' }} />
      </Stack>

      {!splashUnmounted && (
        <AnimatedSplash
          // Hold the splash until BOTH auth has resolved AND custom fonts
          // are loaded. Otherwise the first frame after dismiss flashes
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
        <ErrorBoundary>
          <AuthProvider>
            <DataProvider>
              <RootNav />
            </DataProvider>
          </AuthProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
