import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function BotArenaScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.header}>
          <ThemedText type="title">Bot Arena</ThemedText>
          <ThemedText type="default">Darwinian Battleground & Strategy Evolution</ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="subtitle">Active Pool & Succession</ThemedText>
          <ThemedText type="default" style={styles.description}>
            This screen will display the active trading bots, their genomes, generation metrics, and the status of the probation slot. 
          </ThemedText>
          <ThemedText type="small" style={styles.status}>
            [Status: Under Development in Phase 2]
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
