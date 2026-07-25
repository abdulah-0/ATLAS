import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { SEED_GENOMES } from '../services/seedGenomes';
import { BotGenome } from '../types/genome';
import { deathMonitor, DeathCheckResult } from '../services/deathMonitor';
import { probationManager } from '../services/probation';

interface BotArenaStateItem {
  genome: BotGenome;
  status: 'probation' | 'active' | 'champion' | 'dead';
  stats: {
    totalTrades: number;
    winCount: number;
    lossCount: number;
    winRate: number; // e.g. 55.0
    profitFactor: number; // e.g. 1.85
    totalPnlUsd: number;
    currentDrawdown: number; // e.g. 3.5
    consecutiveLosses: number;
    sharpe30d: number;
    ageDays: number;
  };
  health: DeathCheckResult;
}

interface KillFeedItem {
  id: string;
  bot_id: string;
  nickname: string;
  generation: number;
  diedAt: string;
  reasons: string[];
  replacementBotId: string;
}

export default function BotArenaScreen() {
  const [activeTab, setActiveTab] = useState<'arena' | 'killfeed'>('arena');
  const [loading, setLoading] = useState(false);
  const [expandedBotId, setExpandedBotId] = useState<string | null>(null);

  // Initial State populated with Seed Genomes and mock live metrics
  const [bots, setBots] = useState<BotArenaStateItem[]>([
    {
      genome: SEED_GENOMES[0], // atlas_001 Momentum Hunter
      status: 'champion',
      stats: {
        totalTrades: 34,
        winCount: 21,
        lossCount: 13,
        winRate: 61.76,
        profitFactor: 2.15,
        totalPnlUsd: 840.50,
        currentDrawdown: 2.8,
        consecutiveLosses: 1,
        sharpe30d: 2.45,
        ageDays: 14,
      },
      health: deathMonitor.evaluateHealth('atlas_001', {
        consecutiveLosses: 1,
        winRate: 61.76,
        totalTrades: 34,
        currentDrawdown: 2.8,
        sharpe30d: 2.45,
      }, true) // isChampion = true
    },
    {
      genome: SEED_GENOMES[1], // atlas_002 Mean Reversion
      status: 'probation',
      stats: {
        totalTrades: 12,
        winCount: 7,
        lossCount: 5,
        winRate: 58.33,
        profitFactor: 1.62,
        totalPnlUsd: 210.00,
        currentDrawdown: 4.1,
        consecutiveLosses: 2,
        sharpe30d: 1.80,
        ageDays: 5,
      },
      health: deathMonitor.evaluateHealth('atlas_002', {
        consecutiveLosses: 2,
        winRate: 58.33,
        totalTrades: 12,
        currentDrawdown: 4.1,
        sharpe30d: 1.80,
      }, false)
    }
  ]);

  const [killFeed, setKillFeed] = useState<KillFeedItem[]>([
    {
      id: 'kf_001',
      bot_id: 'atlas_000_alpha',
      nickname: 'Prototype Scalper',
      generation: 1,
      diedAt: '2 days ago',
      reasons: ['Hit 5 consecutive losses', 'Rolling win rate dropped to 35%'],
      replacementBotId: 'atlas_002',
    }
  ]);

  const getHealthColor = (score: number) => {
    if (score >= 70) return '#00E676';
    if (score >= 40) return '#FF9100';
    return '#FF1744';
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>

        {/* Navigation Sub-Header Tabs */}
        <View style={styles.tabHeader}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'arena' && styles.tabButtonActive]}
            onPress={() => setActiveTab('arena')}
          >
            <ThemedText type="smallBold" style={{ color: activeTab === 'arena' ? '#FF9900' : '#8E8E93' }}>
              BOT ARENA ({bots.length})
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'killfeed' && styles.tabButtonActive]}
            onPress={() => setActiveTab('killfeed')}
          >
            <ThemedText type="smallBold" style={{ color: activeTab === 'killfeed' ? '#FF9900' : '#8E8E93' }}>
              KILL FEED & HALL OF FAME ({killFeed.length})
            </ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {activeTab === 'arena' && (
            <View style={styles.sectionGap}>

              {/* Pool Status Banner */}
              <ThemedView type="backgroundElement" style={styles.summaryBanner}>
                <View style={styles.summaryCol}>
                  <ThemedText type="small" style={{ opacity: 0.5 }}>ACTIVE POOL</ThemedText>
                  <ThemedText type="subtitle">2 / 5 Bots</ThemedText>
                </View>
                <View style={styles.summaryCol}>
                  <ThemedText type="small" style={{ opacity: 0.5 }}>PROBATION SLOT</ThemedText>
                  <ThemedText type="subtitle" style={{ color: '#FF9100' }}>1 Active</ThemedText>
                </View>
                <View style={styles.summaryCol}>
                  <ThemedText type="small" style={{ opacity: 0.5 }}>CHAMPION</ThemedText>
                  <ThemedText type="subtitle" style={{ color: '#00E676' }}>atlas_001</ThemedText>
                </View>
              </ThemedView>

              {/* Bot Cards List */}
              {bots.map((item) => {
                const isExpanded = expandedBotId === item.genome.bot_id;
                const probationInfo = probationManager.evaluateProbation(
                  item.genome.bot_id,
                  item.stats.totalTrades,
                  item.stats.winRate,
                  item.stats.profitFactor
                );

                return (
                  <TouchableOpacity
                    key={item.genome.bot_id}
                    activeOpacity={0.9}
                    onPress={() => setExpandedBotId(isExpanded ? null : item.genome.bot_id)}
                  >
                    <ThemedView type="backgroundElement" style={styles.botCard}>

                      {/* Top Header Row */}
                      <View style={styles.cardHeader}>
                        <View style={styles.titleGroup}>
                          <View style={styles.badgeRow}>
                            {item.status === 'champion' && (
                              <View style={styles.crownBadge}>
                                <ThemedText type="smallBold" style={{ color: '#FFD700', fontSize: 10 }}>👑 CHAMPION</ThemedText>
                              </View>
                            )}
                            {item.status === 'probation' && (
                              <View style={styles.probationBadge}>
                                <ThemedText type="smallBold" style={{ color: '#FF9100', fontSize: 10 }}>
                                  PROBATION: {item.stats.totalTrades}/20
                                </ThemedText>
                              </View>
                            )}
                            <View style={styles.genBadge}>
                              <ThemedText type="small" style={{ fontSize: 10 }}>GEN {item.genome.generation}</ThemedText>
                            </View>
                          </View>
                          
                          <ThemedText type="subtitle" style={{ marginTop: Spacing.half }}>
                            {item.genome.bot_id} • {item.genome.nickname}
                          </ThemedText>
                          <ThemedText type="small" style={{ opacity: 0.6 }}>
                            {item.genome.entry.primary_signal.toUpperCase()} • {item.genome.preferred_timeframe} • Alive {item.stats.ageDays}d
                          </ThemedText>
                        </View>

                        <View style={styles.pnlGroup}>
                          <ThemedText type="subtitle" style={{ color: item.stats.totalPnlUsd >= 0 ? '#00E676' : '#FF1744' }}>
                            {item.stats.totalPnlUsd >= 0 ? '+' : ''}${item.stats.totalPnlUsd.toFixed(2)}
                          </ThemedText>
                          <ThemedText type="small" style={{ opacity: 0.6 }}>
                            Sharpe {item.stats.sharpe30d.toFixed(2)}
                          </ThemedText>
                        </View>
                      </View>

                      {/* Composite Health Bar */}
                      <View style={styles.healthSection}>
                        <View style={styles.healthLabelRow}>
                          <ThemedText type="small" style={{ opacity: 0.7 }}>COMPOSITE HEALTH</ThemedText>
                          <ThemedText type="smallBold" style={{ color: getHealthColor(item.health.compositeScore) }}>
                            {item.health.compositeScore} / 100
                          </ThemedText>
                        </View>
                        <View style={styles.healthTrack}>
                          <View
                            style={[
                              styles.healthFill,
                              {
                                width: `${item.health.compositeScore}%`,
                                backgroundColor: getHealthColor(item.health.compositeScore),
                              },
                            ]}
                          />
                        </View>
                      </View>

                      {/* Death Trigger Badges */}
                      <View style={styles.triggersRow}>
                        {/* Trigger 1 Badge */}
                        <View style={[
                          styles.triggerChip,
                          item.stats.consecutiveLosses >= 4 && styles.triggerChipWarning,
                          item.stats.consecutiveLosses >= 5 && styles.triggerChipDanger,
                        ]}>
                          <ThemedText type="small" style={styles.triggerText}>
                            Loss Streak: {item.stats.consecutiveLosses}/5
                          </ThemedText>
                        </View>

                        {/* Trigger 2 Badge */}
                        <View style={[
                          styles.triggerChip,
                          item.stats.totalTrades >= 15 && item.stats.winRate < 45 && styles.triggerChipWarning,
                          item.stats.totalTrades >= 20 && item.stats.winRate < 40 && styles.triggerChipDanger,
                        ]}>
                          <ThemedText type="small" style={styles.triggerText}>
                            Win Rate: {item.stats.winRate.toFixed(0)}%
                          </ThemedText>
                        </View>

                        {/* Trigger 3 Badge */}
                        <View style={[
                          styles.triggerChip,
                          item.stats.currentDrawdown >= 10 && styles.triggerChipWarning,
                          item.stats.currentDrawdown >= 15 && styles.triggerChipDanger,
                        ]}>
                          <ThemedText type="small" style={styles.triggerText}>
                            Drawdown: -{item.stats.currentDrawdown.toFixed(1)}%
                          </ThemedText>
                        </View>
                      </View>

                      {/* Expandable Strategy Details */}
                      {isExpanded && (
                        <View style={styles.expandedDetails}>
                          <View style={styles.divider} />
                          <ThemedText type="smallBold" style={{ color: '#FF9900', marginBottom: Spacing.one }}>
                            STRATEGY GENOME SPECS
                          </ThemedText>
                          <ThemedText type="small">Asset Universe: {item.genome.asset_universe.join(', ')}</ThemedText>
                          <ThemedText type="small">RSI Trigger: &lt;= {item.genome.entry.rsi_entry}</ThemedText>
                          <ThemedText type="small">Volume Mult: {item.genome.entry.volume_mult}x</ThemedText>
                          <ThemedText type="small">Stop Loss: {(item.genome.exit.stop_loss_pct * 100).toFixed(1)}% | Risk:Reward: 1:{item.genome.exit.take_profit_rr}</ThemedText>
                          <ThemedText type="small">Active Regimes: {item.genome.regime_filters.active_in.join(', ')}</ThemedText>
                          {probationInfo.isEvaluationComplete && (
                            <ThemedText type="smallBold" style={{ marginTop: Spacing.one, color: probationInfo.passed ? '#00E676' : '#FF1744' }}>
                              Probation Result: {probationInfo.reason}
                            </ThemedText>
                          )}
                        </View>
                      )}

                    </ThemedView>
                  </TouchableOpacity>
                );
              })}

            </View>
          )}

          {activeTab === 'killfeed' && (
            <View style={styles.sectionGap}>
              <ThemedText type="smallBold" style={{ opacity: 0.6 }}>HISTORICAL TERMINATION LEDGER</ThemedText>

              {killFeed.map(item => (
                <ThemedView key={item.id} type="backgroundElement" style={styles.killCard}>
                  <View style={styles.killHeader}>
                    <View>
                      <ThemedText type="default" style={{ color: '#FF1744', fontWeight: 'bold' }}>
                        💀 {item.bot_id} ({item.nickname})
                      </ThemedText>
                      <ThemedText type="small" style={{ opacity: 0.5 }}>Generation {item.generation} • Eliminated {item.diedAt}</ThemedText>
                    </View>
                    <View style={styles.replacementBadge}>
                      <ThemedText type="small" style={{ fontSize: 10, color: '#00E676' }}>
                        Replaced by {item.replacementBotId}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.reasonsList}>
                    {item.reasons.map((r, i) => (
                      <ThemedText key={i} type="small" style={{ color: '#FFB74D' }}>
                        • {r}
                      </ThemedText>
                    ))}
                  </View>
                </ThemedView>
              ))}
            </View>
          )}

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
  tabHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#2D3035',
    backgroundColor: '#161719',
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#FF9900',
  },
  scrollContent: {
    padding: Spacing.three,
  },
  sectionGap: {
    gap: Spacing.three,
  },
  summaryBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: '#161719',
    borderWidth: 1,
    borderColor: '#2D3035',
  },
  summaryCol: {
    alignItems: 'flex-start',
  },
  botCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: '#161719',
    borderWidth: 1,
    borderColor: '#2D3035',
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleGroup: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.one,
    alignItems: 'center',
  },
  crownBadge: {
    backgroundColor: '#3A3200',
    paddingHorizontal: Spacing.one,
    paddingVertical: 2,
    borderRadius: Spacing.half,
  },
  probationBadge: {
    backgroundColor: '#3A2000',
    paddingHorizontal: Spacing.one,
    paddingVertical: 2,
    borderRadius: Spacing.half,
  },
  genBadge: {
    backgroundColor: '#2A2C30',
    paddingHorizontal: Spacing.one,
    paddingVertical: 2,
    borderRadius: Spacing.half,
  },
  pnlGroup: {
    alignItems: 'flex-end',
  },
  healthSection: {
    gap: Spacing.half,
  },
  healthLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  healthTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2A2C30',
    overflow: 'hidden',
  },
  healthFill: {
    height: '100%',
    borderRadius: 3,
  },
  triggersRow: {
    flexDirection: 'row',
    gap: Spacing.one,
    flexWrap: 'wrap',
  },
  triggerChip: {
    backgroundColor: '#2A2C30',
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Spacing.four,
  },
  triggerChipWarning: {
    backgroundColor: '#4A2800',
  },
  triggerChipDanger: {
    backgroundColor: '#4A0000',
  },
  triggerText: {
    fontSize: 11,
  },
  expandedDetails: {
    marginTop: Spacing.one,
    gap: Spacing.half,
  },
  divider: {
    height: 1,
    backgroundColor: '#2D3035',
    marginVertical: Spacing.one,
  },
  killCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: '#161719',
    borderWidth: 1,
    borderColor: '#3D1E22',
    gap: Spacing.one,
  },
  killHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  replacementBadge: {
    backgroundColor: '#102A18',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Spacing.one,
  },
  reasonsList: {
    marginTop: Spacing.one,
  },
});
