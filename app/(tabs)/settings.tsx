import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { TabsHeader } from '@/components/TabsHeader';
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
    <Screen>
      <TabsHeader />
      <View style={styles.header}>
        <Text style={typography.h1}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={{ gap: spacing.md, padding: spacing.base, paddingBottom: 140 }}>
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
          title="PawProof Plus"
          subtitle={
            profile?.isPremium
              ? 'Active · tap to manage or switch your plan'
              : 'Unlock Smart Scan, unlimited pets, PDFs, and caregiver sharing.'
          }
          onPress={() => router.push('/paywall')}
        />

        <Row
          icon="refresh-outline"
          title="Restore purchases"
          subtitle="If you've subscribed on this Apple ID before"
          onPress={() => {
            // Stub: when StoreKit / RevenueCat is wired, replace this
            // with the platform restore call. For now we acknowledge
            // so the App Store reviewer sees the entry point exists.
            Alert.alert(
              'Restore purchases',
              'Subscriptions are restored automatically when you reinstall PawProof while signed into the same Apple ID. If something looks wrong, email support@pawproof.app.',
            );
          }}
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
          subtitle="Grouping, vaccine warnings, and iOS permissions"
          onPress={() => router.push('/settings/notifications')}
        />

        <Row
          icon="speedometer-outline"
          title="Units"
          subtitle="Miles or kilometers for walks and summaries"
          onPress={() => router.push('/settings/units')}
        />

        <Row
          icon="chatbubbles-outline"
          title="My tickets"
          subtitle="View admin replies and submit new tickets"
          onPress={() => router.push('/support')}
        />

        <Row
          icon="chatbubble-ellipses-outline"
          title="Report an issue"
          subtitle="Bugs, feature ideas, or anything that feels off"
          onPress={() => setReportOpen(true)}
        />

        <Row
          icon="help-circle-outline"
          title="Email support"
          subtitle="support@pawproof.app"
          onPress={() => Linking.openURL('mailto:support@pawproof.app')}
        />

        <Row
          icon="people-outline"
          title="Manage people"
          subtitle={
            profile?.isPremium
              ? 'Invite and manage caregivers for your pets'
              : 'Invite caregivers with PawProof Plus'
          }
          trailing={!profile?.isPremium ? <PlusPill /> : undefined}
          onPress={() => {
            // Caregiver sharing is a Plus feature. Free users get a
            // gated preview with the matching paywall copy; Plus
            // users go straight in.
            if (!profile?.isPremium) {
              router.push({
                pathname: '/paywall',
                params: {
                  gate: 'manage_people',
                  reason:
                    'Invite family, roommates, or pet sitters to help log care and view selected pet records.',
                },
              });
              return;
            }
            router.push('/share/manage');
          }}
        />

        <Row
          icon="people-circle-outline"
          title="Accept an invite"
          subtitle="Enter a 6-character care code to help with someone's pet"
          onPress={() => router.push('/share/accept')}
        />

        <Row
          icon="archive-outline"
          title="Your data"
          subtitle="Export backups, records PDFs, or delete your data"
          onPress={() => router.push('/data/export')}
        />

        <Row
          icon="globe-outline"
          title="Web dashboard"
          subtitle="pawproof.app · manage tickets and account settings"
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
  icon, title, subtitle, onPress, trailing,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={typography.bodyStrong}>{title}</Text>
        {subtitle ? <Text style={typography.caption}>{subtitle}</Text> : null}
      </View>
      {trailing ? <View style={{ marginRight: 4 }}>{trailing}</View> : null}
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

// Small "PLUS" badge used to flag rows that require a subscription.
// Same visual as the account-card plusBadge but standalone.
function PlusPill() {
  return (
    <View style={styles.plusPill}>
      <Ionicons name="sparkles" size={10} color="#fff" />
      <Text style={styles.plusPillText}>PLUS</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
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
  // Compact "PLUS" pill used on rows that require a subscription.
  // Visually matches the account-card badge but with slightly tighter
  // padding so it doesn't crowd the trailing chevron.
  plusPill: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 7, paddingVertical: 3,
    flexDirection: 'row', alignItems: 'center', gap: 3,
  },
  plusPillText: { color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: 0.6 },
  signOut: {
    backgroundColor: colors.dangerSoft,
    padding: spacing.md, borderRadius: radius.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: spacing.sm,
  },
  signOutText: { color: colors.danger, fontWeight: '600' },
  fineprint: { textAlign: 'center', color: colors.textFaint, fontSize: 11, marginTop: spacing.md },
});
