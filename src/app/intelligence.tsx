import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function IntelligenceScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.header}>
          <ThemedText type="title">Market Intel</ThemedText>
          <ThemedText type="default">Regimes, News, and Macro Sentiment</ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="subtitle">Regime Brain & News Digest</ThemedText>
          <ThemedText type="default" style={styles.description}>
            This screen will show the current market regime trend, standard deviation volatility curves, fear & greed index gauge, and live sentiment-classified headlines.
          </ThemedText>
          <ThemedText type="small" style={styles.status}>
            [Status: Under Development in Phase 3/5]
          </ThemedText>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.four,
  },
  safeArea: {
    flex: 1,
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.one,
  },
  card: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  description: {
    opacity: 0.8,
  },
  status: {
    marginTop: Spacing.two,
    opacity: 0.6,
    fontStyle: 'italic',
  },
});
