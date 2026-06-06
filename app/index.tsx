import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/AuthProvider';
import { colors } from '@/theme';

export default function Index() {
  const { user, initializing } = useAuth();
  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  // Unauthenticated users land on the welcome carousel (value before the
  // login wall); welcome has a prominent "Sign in" link for returning users.
  return <Redirect href={(user ? '/(tabs)' : '/(auth)/welcome') as never} />;
}
