import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';

// App-wide error boundary. Without this, a single render-time throw (e.g. a
// malformed date reaching date-fns `format()`) white-screens the entire app
// with no recovery. This catches the throw, shows a friendly fallback, and
// lets the user retry by remounting the subtree.

interface Props {
  children: React.ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surface in dev; in production this is where a Crashlytics/Sentry hook
    // would go.
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <View style={styles.root}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.emoji}>🐾</Text>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.body}>
              We hit an unexpected error. Your data is safe. Try again, and if it
              keeps happening, reach out from Settings → Support.
            </Text>
            <Pressable
              onPress={this.reset}
              style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.btnText}>Try again</Text>
            </Pressable>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.sm },
  emoji: { fontSize: 48, marginBottom: spacing.sm },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
  body: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20, maxWidth: 320 },
  btn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill ?? 999,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
