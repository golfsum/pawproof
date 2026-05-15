import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { ReportIssueSheet } from '@/components/ReportIssueSheet';
import { useAuth } from '@/hooks/AuthProvider';
import { useData } from '@/hooks/useData';
import { colors, radius, spacing, typography } from '@/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, profile, signOut, togglePremium } = useAuth();
  const { pets, documents } = useData();
  const [reportOpen, setReportOpen] = useState(false);

  const handleSignOut = () => {
    Alert.alert('Sign out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/sign-in');
        },
      },
    ]);
  };

  return (
    <Screen padded>
      <Stack.Screen options={{ title: 'Settings' }} />
      <ScrollView contentContainerStyle={{ gap: spacing.md, paddingVertical: spacing.md }}>
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Ionicons name="person-outline" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={typography.bodyStrong}>{profile?.email ?? user?.email ?? 'You'}</Text>
            <Text style={[typography.caption]}>{pets.length} pets · {documents.length} documents</Text>
          </View>
          {profile?.isPremium ? (
            <View style={styles.plusBadge}>
              <Ionicons name="sparkles" size={12} color="#fff" />
              <Text style={styles.plusText}>PLUS</Text>
            </View>
          ) : null}
        </View>

        <Row
          icon="sparkles-outline"
          title={profile?.isPremium ? 'PawProof Plus' : 'Upgrade to PawProof Plus'}
          subtitle={profile?.isPremium ? 'You\'re a Plus member.' : 'Unlimited pets, OCR, PDF export, and more.'}
          onPress={() => router.push('/paywall')}
        />

        {__DEV__ ? (
          <Row
            icon="flask-outline"
            title="Dev: toggle premium"
            subtitle="Flip the isPremium flag without going through the paywall."
            onPress={() => togglePremium()}
          />
        ) : null}

        <Row
          icon="notifications-outline"
          title="Notifications"
          subtitle="Manage reminder permissions in iOS Settings."
          onPress={() => Linking.openSettings()}
        />

        <Row
          icon="chatbubble-ellipses-outline"
          title="Report an issue"
          subtitle="Bugs, feature ideas, anything that feels off"
          onPress={() => setReportOpen(true)}
        />

        <Row
          icon="help-circle-outline"
          title="Email support"
          subtitle="support@pawproof.app"
          onPress={() => Linking.openURL('mailto:support@pawproof.app')}
        />

        <Row
          icon="globe-outline"
          title="Web dashboard"
          subtitle="pawproof.app — view tickets and manage your account"
          onPress={() => Linking.openURL('https://pawproof.app/dashboard')}
        />

        <Row
          icon="shield-checkmark-outline"
          title="Privacy Policy"
          onPress={() => Linking.openURL('https://pawproof.app/privacy')}
        />

        <Row
          icon="document-text-outline"
          title="Terms of Service"
          onPress={() => Linking.openURL('https://pawproof.app/terms')}
        />

        <Pressable onPress={handleSignOut} style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.85 }]}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>

        <Text style={styles.fineprint}>PawProof v1.0 · Made for pet people</Text>
      </ScrollView>

      <ReportIssueSheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        context={{ petCount: pets.length, documentCount: documents.length }}
      />
    </Screen>
  );
}

function Row({
  icon, title, subtitle, onPress,
}: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={typography.bodyStrong}>{title}</Text>
        {subtitle ? <Text style={typography.caption}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  rowIcon: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  plusBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 8, paddingVertical: 4,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  plusText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  signOut: {
    backgroundColor: colors.dangerSoft,
    padding: spacing.md, borderRadius: radius.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: spacing.sm,
  },
  signOutText: { color: colors.danger, fontWeight: '600' },
  fineprint: { textAlign: 'center', color: colors.textFaint, fontSize: 11, marginTop: spacing.md },
});
