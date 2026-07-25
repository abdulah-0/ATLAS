import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function BtcStackScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.header}>
          <ThemedText type="title">BTC Stack</ThemedText>
          <ThemedText type="default">Compounding Profits to 20 BTC Target</ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="subtitle">Accumulation Ledger</ThemedText>
          <ThemedText type="default" style={styles.description}>
            This screen will track converted trade profits, showing cost-basis weighted averages, the progress bar towards 20 BTC, and milestone statistics.
          </ThemedText>
          <ThemedText type="small" style={styles.status}>
            [Status: Under Development in Phase 4]
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
