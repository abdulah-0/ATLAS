import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function TradeFeedScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.header}>
          <ThemedText type="title">Trade Feed</ThemedText>
          <ThemedText type="default">Historical Ledger & Decision Reflections</ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="subtitle">Audit Trail & RAG Matches</ThemedText>
          <ThemedText type="default" style={styles.description}>
            This screen will display a chronological feed of all orders and executed trades across all bots, including detailed Pinecone similarity matches and Opus decision reasons.
          </ThemedText>
          <ThemedText type="small" style={styles.status}>
            [Status: Under Development in Phase 3]
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
