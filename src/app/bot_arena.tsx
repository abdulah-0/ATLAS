import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { BotGenome } from '../types/genome';
import { SEED_GENOMES } from '../services/seedGenomes';
import { dbOperations } from '../services/db';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BotArenaScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top + 8, 20);
  const [expandedBotId, setExpandedBotId] = useState<string | null>(null);
  const [bots, setBots] = useState<BotGenome[]>(SEED_GENOMES);

  useEffect(() => {
    loadBotsFromDb();
  }, []);

  const loadBotsFromDb = async () => {
    try {
      const dbBots = await dbOperations.getActiveBots();
      if (dbBots && dbBots.length > 0) {
        setBots(dbBots.map(b => typeof b.genome === 'string' ? JSON.parse(b.genome) : b.genome || b));
      }
    } catch (e) {
      console.log('Using seed genomes for Bot Arena UI');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: topPadding }]} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="small" style={{ opacity: 0.6 }}>DARWINIAN BOT ARENA</ThemedText>
            <ThemedText type="subtitle">Active Genomes & Life-Cycle</ThemedText>
          </View>

          {/* Active Bot Cards */}
          {bots.map((bot, index) => {
            const isExpanded = expandedBotId === bot.bot_id;
            const healthScore = 85;
            const isChampion = index === 0;
            const primaryAsset = bot.asset_universe?.[0] || 'BTC/USD';

            return (
              <TouchableOpacity
                key={bot.bot_id}
                activeOpacity={0.9}
                onPress={() => setExpandedBotId(isExpanded ? null : bot.bot_id)}
              >
                <ThemedView type="backgroundElement" style={styles.botCard}>
                  
                  {/* Top Card Row */}
                  <View style={styles.cardHeaderRow}>
                    <View style={{ flex: 1, flexShrink: 1 }}>
                      <View style={styles.tagRow}>
                        {isChampion && (
                          <View style={styles.championBadge}>
                            <ThemedText type="smallBold" style={{ color: '#000', fontSize: 10 }}>
                              👑 #1 CHAMPION
                            </ThemedText>
                          </View>
                        )}
                        <ThemedText type="small" style={{ opacity: 0.6 }}>
                          Gen {bot.generation} • {primaryAsset}
                        </ThemedText>
                      </View>

                      <ThemedText type="subtitle" style={styles.botTitleText} numberOfLines={1}>
                        {bot.nickname} ({bot.bot_id})
                      </ThemedText>
                    </View>

                    <View style={{ alignItems: 'flex-end', minWidth: 70 }}>
                      <ThemedText type="subtitle" style={{ color: healthScore > 50 ? '#00E676' : '#FF9100' }}>
                        {healthScore}/100
                      </ThemedText>
                      <ThemedText type="small" style={{ opacity: 0.6 }}>Health Score</ThemedText>
                    </View>
                  </View>

                  {/* Health Progress Track */}
                  <View style={styles.healthTrackBg}>
                    <View style={[styles.healthTrackFill, { width: `${healthScore}%`, backgroundColor: healthScore > 50 ? '#00E676' : '#FF9100' }]} />
                  </View>

                  {/* Quick Metrics Row */}
                  <View style={styles.metricsRow}>
                    <View style={styles.metricItem}>
                      <ThemedText type="small" style={{ opacity: 0.5 }}>TIMEFRAME</ThemedText>
                      <ThemedText type="smallBold">{bot.preferred_timeframe || '15min'}</ThemedText>
                    </View>

                    <View style={styles.metricItem}>
                      <ThemedText type="small" style={{ opacity: 0.5 }}>SIGNAL TYPE</ThemedText>
                      <ThemedText type="smallBold" numberOfLines={1}>{bot.entry?.primary_signal || 'momentum'}</ThemedText>
                    </View>

                    <View style={styles.metricItem}>
                      <ThemedText type="small" style={{ opacity: 0.5 }}>STATUS</ThemedText>
                      <ThemedText type="smallBold" style={{ color: '#00E676' }}>ACTIVE</ThemedText>
                    </View>
                  </View>

                  {/* Expanded DNA Details */}
                  {isExpanded && (
                    <View style={styles.expandedSection}>
                      <View style={styles.divider} />
                      <ThemedText type="smallBold" style={{ color: '#FF9900' }}>ENTRY RULES & CONFLUENCE</ThemedText>
                      <ThemedText type="small" style={{ opacity: 0.8, marginTop: 2 }}>
                        • Primary Signal: {bot.entry?.primary_signal}
                      </ThemedText>
                      <ThemedText type="small" style={{ opacity: 0.8 }}>
                        • Min Confidence: {((bot.entry?.min_confidence || 0.7) * 100).toFixed(0)}%
                      </ThemedText>

                      <ThemedText type="smallBold" style={{ color: '#FF9900', marginTop: Spacing.two }}>EXIT RULES & SIZING</ThemedText>
                      <ThemedText type="small" style={{ opacity: 0.8, marginTop: 2 }}>
                        • Stop Loss: {((bot.exit?.stop_loss_pct || 0.018) * 100).toFixed(1)}% | Take Profit R:R: {bot.exit?.take_profit_rr || 2.5}
                      </ThemedText>
                      <ThemedText type="small" style={{ opacity: 0.8 }}>
                        • Base Position Size: {bot.sizing?.base_pct || 10}%
                      </ThemedText>
                    </View>
                  )}

                </ThemedView>
              </TouchableOpacity>
            );
          })}

          {/* Kill Feed / Hall of Fame Ledger */}
          <View style={styles.sectionHeader}>
            <ThemedText type="smallBold" style={{ opacity: 0.7 }}>HALL OF FAME & KILL FEED</ThemedText>
          </View>

          <ThemedView type="backgroundElement" style={styles.emptyCard}>
            <ThemedText type="smallBold" style={{ color: '#FF9900', textAlign: 'center' }}>
              🛡️ All Seed Genomes Healthy & Active
            </ThemedText>
            <ThemedText type="small" style={{ opacity: 0.6, textAlign: 'center', marginTop: 4 }}>
              No bot terminations recorded yet. The Death Monitor evaluates performance over 20-trade rolling windows.
            </ThemedText>
          </ThemedView>

        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  header: {
    marginTop: Spacing.one,
  },
  botCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: '#161719',
    borderWidth: 1,
    borderColor: '#2D3035',
    gap: Spacing.two,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    flexWrap: 'wrap',
  },
  championBadge: {
    backgroundColor: '#FF9900',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Spacing.one,
  },
  botTitleText: {
    fontSize: 18,
    marginTop: 2,
  },
  healthTrackBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2A2C30',
    overflow: 'hidden',
  },
  healthTrackFill: {
    height: '100%',
    borderRadius: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.one,
    borderTopWidth: 1,
    borderTopColor: '#25272B',
  },
  metricItem: {
    flex: 1,
  },
  expandedSection: {
    marginTop: Spacing.one,
  },
  divider: {
    height: 1,
    backgroundColor: '#2D3035',
    marginBottom: Spacing.two,
  },
  sectionHeader: {
    marginTop: Spacing.one,
  },
  emptyCard: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    backgroundColor: '#161719',
    borderWidth: 1,
    borderColor: '#2D3035',
    alignItems: 'center',
  },
});
