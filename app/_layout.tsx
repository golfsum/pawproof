import 'react-native-gesture-handler';
import React, { useEffect, useRef, useState } from 'react';
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
import { DataProvider, useData } from '@/hooks/useData';
import {
  setupAndroidChannel,
  getNotificationPermission,
  requestNotificationPermission,
} from '@/lib/notifications';
import {
  recordAppOpen,
  shouldRequestNotifFirstRun,
  shouldShowStartupPaywall,
} from '@/lib/appPrompts';
import { FREE_LIMITS } from '@/lib/premium';
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
  const { pets } = useData();
  const segments = useSegments();
  const router = useRouter();
  const [splashUnmounted, setSplashUnmounted] = useState(false);
  // Guards the startup-prompt logic (first-run notif ask / occasional paywall)
  // so it runs at most once per app launch, not on every segment change.
  const startupHandledRef = useRef(false);
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
    // The paywall is a modal that onboarding itself can open (the 3+ pets
    // nudge). Treat it as part of the onboarding flow so the guard below
    // doesn't yank a not-yet-onboarded user off the paywall and back to the
    // wizard the instant it's pushed.
    const inPaywall = segments[0] === 'paywall';
    if (!user && !inAuthGroup) {
      // Land first-time / signed-out users on the welcome carousel (value
      // before the login wall), not straight on sign-in. Welcome has a
      // prominent "Sign in" link for returning users.
      // Cast: typed-routes types regenerate on the next expo start/build;
      // the welcome route is real (app/(auth)/welcome.tsx).
      router.replace('/(auth)/welcome' as never);
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
    if (user && profile && !profile.onboardingCompleted && !inOnboarding && !inAuthGroup && !inPaywall) {
      router.replace('/onboarding');
      return;
    }

    // Downgrade gate: a non-premium user with more ACTIVE pets than the free
    // limit must reconcile (pick which to keep / upgrade) before using the app.
    // Counts only non-inactive pets so it stops firing once they've parked the
    // extras. Skipped during onboarding/auth so those flows aren't interrupted.
    const activePets = pets.filter(p => !p.inactive).length;
    const inDowngrade = (segments[0] as string) === 'downgrade';
    if (
      user && profile && profile.onboardingCompleted && !profile.isPremium &&
      activePets > FREE_LIMITS.pets && !inDowngrade && !inOnboarding && !inAuthGroup
    ) {
      router.replace('/downgrade' as never);
    }
  }, [user, profile, initializing, segments, pets]);

  // Startup engagement prompts — runs once per launch, only once the user is
  // signed in and past onboarding/downgrade (so it never fights those flows).
  //   1. First ever run: ask for notification permission.
  //   2. Returning free users: show the paywall every ~10–15 launches
  //      (never on the first run), so it nudges without nagging.
  useEffect(() => {
    if (initializing || !user || !profile) return;
    if (!profile.onboardingCompleted) return;
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';
    const inDowngrade = (segments[0] as string) === 'downgrade';
    if (inAuthGroup || inOnboarding || inDowngrade) return;
    if (startupHandledRef.current) return;
    startupHandledRef.current = true;

    (async () => {
      try {
        const openCount = await recordAppOpen();
        // First run: surface the notification permission ask once.
        if (await shouldRequestNotifFirstRun()) {
          if ((await getNotificationPermission()) === 'undetermined') {
            await requestNotificationPermission();
          }
          return; // don't also paywall on the very first run
        }
        // Returning free users: occasional start-up paywall.
        if (!profile.isPremium && (await shouldShowStartupPaywall(openCount))) {
          router.push('/paywall');
        }
      } catch (e) {
        console.warn('[startup] prompt logic failed', e);
      }
    })();
  }, [initializing, user, profile, segments, router]);

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
        <Stack.Screen name="pet/vet-report/[id]" options={{ title: 'Vet report' }} />
        <Stack.Screen name="reminder/add" options={{ title: 'New reminder', presentation: 'modal' }} />
        <Stack.Screen name="medication/add" options={{ title: 'Add medication', presentation: 'modal' }} />
        <Stack.Screen name="medication/[id]" options={{ title: 'Medication' }} />
        <Stack.Screen name="vaccine/add" options={{ title: 'Add vaccine record', presentation: 'modal' }} />
        <Stack.Screen name="vaccine/edit/[id]" options={{ title: 'Edit vaccine record', presentation: 'modal' }} />
        <Stack.Screen name="vaccine/scan" options={{ title: 'Scan vaccine', presentation: 'modal' }} />
        <Stack.Screen name="invoice/scan" options={{ title: 'Scan vet invoice', presentation: 'modal' }} />
        <Stack.Screen name="receipt/scan" options={{ title: 'Scan receipt', presentation: 'modal' }} />
        <Stack.Screen name="receipts/index" options={{ title: 'Spending' }} />
        <Stack.Screen name="document/scan" options={{ title: 'Scan Document', presentation: 'modal' }} />
        <Stack.Screen name="document/upload" options={{ title: 'Add document', presentation: 'modal' }} />
        <Stack.Screen name="document/[id]" options={{ title: 'Document' }} />
        <Stack.Screen name="paywall" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="support/index" options={{ title: 'Support' }} />
        <Stack.Screen name="support/[id]" options={{ title: 'Ticket' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="downgrade" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="data/export" options={{ title: 'Your data' }} />
        <Stack.Screen name="pet/share/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="pet/care/[id]" options={{ title: 'Care instructions', presentation: 'modal' }} />
        <Stack.Screen name="settings/notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="settings/delete-account" options={{ title: 'Delete account' }} />
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
