import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

interface TradeFeedCardItem {
  id: string;
  bot_id: string;
  bot_nickname: string;
  asset: string;
  direction: 'LONG' | 'SHORT';
  signal_type: string;
  entry_price: number;
  exit_price: number;
  pnl_usd: number;
  pnl_pct: number;
  duration_m: number;
  opened_at: string;
  status: 'OPEN' | 'CLOSED';
  opus_reasoning: string;
  opus_confidence: number;
  rag_matches: Array<{
    outcome: string;
    pnl_pct: number;
    what_worked: string;
    what_failed: string;
  }>;
  reflection?: {
    what_worked: string;
    what_failed: string;
    rule_update: string | null;
    summary: string;
  };
}

export default function TradeFeedScreen() {
  const [filter, setFilter] = useState<'all' | 'wins' | 'losses'>('all');
  const [expandedTradeId, setExpandedTradeId] = useState<string | null>(null);

  // Initial Mock Trade Feed Data matching PRD schemas
  const [trades] = useState<TradeFeedCardItem[]>([
    {
      id: 'tr_1092',
      bot_id: 'atlas_001',
      bot_nickname: 'Momentum Hunter',
      asset: 'BTC/USD',
      direction: 'LONG',
      signal_type: 'momentum_breakout',
      entry_price: 67420.00,
      exit_price: 69580.00,
      pnl_usd: 142.50,
      pnl_pct: 3.20,
      duration_m: 94,
      opened_at: '1h 35m ago',
      status: 'CLOSED',
      opus_confidence: 0.85,
      opus_reasoning: 'RSI broke 60 with 2.1x volume confirmation. Similar past setups in BULL regime yielded 80% win rate.',
      rag_matches: [
        {
          outcome: 'WIN',
          pnl_pct: 4.5,
          what_worked: 'Volume confirmation was decisive post-breakout.',
          what_failed: 'Trailing stop was slightly too tight initially.',
        },
        {
          outcome: 'WIN',
          pnl_pct: 2.8,
          what_worked: 'BB squeeze provided clean energy for entry.',
          what_failed: 'Exited early before secondary leg up.',
        }
      ],
      reflection: {
        what_worked: 'Volume spike confirmation at entry provided high momentum.',
        what_failed: 'Minor slippage on market order fill.',
        rule_update: 'Maintain trailing stop distance at 1.0%',
        summary: 'BTC/USD long closed with +3.20% gain in 94m.',
      }
    },
    {
      id: 'tr_1091',
      bot_id: 'atlas_002',
      bot_nickname: 'Mean Reversion',
      asset: 'ETH/USD',
      direction: 'LONG',
      signal_type: 'mean_reversion',
      entry_price: 3480.00,
      exit_price: 3425.00,
      pnl_usd: -39.40,
      pnl_pct: -1.58,
      duration_m: 145,
      opened_at: '5h 10m ago',
      status: 'CLOSED',
      opus_confidence: 0.72,
      opus_reasoning: 'RSI oversold at 28.5 with 1.8% VWAP deviation. Approved with reduced micro-position size.',
      rag_matches: [
        {
          outcome: 'LOSS',
          pnl_pct: -1.4,
          what_worked: 'Stop loss prevented further portfolio drawdown.',
          what_failed: 'Broad market trend broke below support.',
        }
      ],
      reflection: {
        what_worked: 'Hard stop loss executed cleanly, limiting portfolio risk to < 1.0%.',
        what_failed: 'Oversold RSI continued lower due to high macro volume sell-off.',
        rule_update: 'Require volume spike <= 1.2x before mean reversion entries',
        summary: 'ETH/USD long hit stop loss (-1.58%) in 145m.',
      }
    }
  ]);

  const filteredTrades = trades.filter(t => {
    if (filter === 'wins') return t.pnl_pct > 0;
    if (filter === 'losses') return t.pnl_pct < 0;
    return true;
  });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>

        {/* Filter Bar Header */}
        <View style={styles.filterHeader}>
          <TouchableOpacity 
            style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
            onPress={() => setFilter('all')}
          >
            <ThemedText type="smallBold" style={{ color: filter === 'all' ? '#000' : '#8E8E93' }}>
              ALL TRADES ({trades.length})
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.filterChip, filter === 'wins' && styles.filterChipActive]}
            onPress={() => setFilter('wins')}
          >
            <ThemedText type="smallBold" style={{ color: filter === 'wins' ? '#000' : '#8E8E93' }}>
              WINS ONLY
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.filterChip, filter === 'losses' && styles.filterChipActive]}
            onPress={() => setFilter('losses')}
          >
            <ThemedText type="smallBold" style={{ color: filter === 'losses' ? '#000' : '#8E8E93' }}>
              LOSSES ONLY
            </ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {filteredTrades.map(trade => {
            const isExpanded = expandedTradeId === trade.id;
            const isWin = trade.pnl_pct >= 0;

            return (
              <TouchableOpacity
                key={trade.id}
                activeOpacity={0.9}
                onPress={() => setExpandedTradeId(isExpanded ? null : trade.id)}
              >
                <ThemedView type="backgroundElement" style={styles.tradeCard}>

                  {/* Top Card Row */}
                  <View style={styles.cardRow}>
                    <View>
                      <View style={styles.badgeRow}>
                        <View style={[styles.dirBadge, { backgroundColor: trade.direction === 'LONG' ? '#102A18' : '#3D1E22' }]}>
                          <ThemedText type="smallBold" style={{ color: trade.direction === 'LONG' ? '#00E676' : '#FF1744', fontSize: 10 }}>
                            {trade.direction}
                          </ThemedText>
                        </View>
                        <ThemedText type="small" style={{ opacity: 0.6 }}>{trade.opened_at}</ThemedText>
                      </View>
                      
                      <ThemedText type="subtitle" style={{ marginTop: Spacing.half }}>
                        {trade.asset} • {trade.bot_nickname}
                      </ThemedText>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <ThemedText type="subtitle" style={{ color: isWin ? '#00E676' : '#FF1744' }}>
                        {isWin ? '+' : ''}${trade.pnl_usd.toFixed(2)} ({isWin ? '+' : ''}{trade.pnl_pct.toFixed(2)}%)
                      </ThemedText>
                      <ThemedText type="small" style={{ opacity: 0.6 }}>
                        Hold: {trade.duration_m}m
                      </ThemedText>
                    </View>
                  </View>

                  {/* Price Levels Row */}
                  <View style={styles.priceRow}>
                    <ThemedText type="small" style={{ opacity: 0.7 }}>
                      Entry: ${trade.entry_price.toLocaleString()}
                    </ThemedText>
                    <ThemedText type="small" style={{ opacity: 0.7 }}>
                      Exit: ${trade.exit_price.toLocaleString()}
                    </ThemedText>
                    <ThemedText type="smallBold" style={{ color: '#FF9900' }}>
                      Opus Conf: {(trade.opus_confidence * 100).toFixed(0)}%
                    </ThemedText>
                  </View>

                  {/* Expandable Decision & RAG Details */}
                  {isExpanded && (
                    <View style={styles.expandedSection}>
                      <View style={styles.divider} />

                      {/* Opus Decision Reasoning */}
                      <ThemedText type="smallBold" style={{ color: '#FF9900' }}>
                        CLAUDE OPUS PRE-TRADE REASONING
                      </ThemedText>
                      <ThemedText type="small" style={styles.reasoningText}>
                        "{trade.opus_reasoning}"
                      </ThemedText>

                      {/* Pinecone RAG Matches */}
                      <ThemedText type="smallBold" style={{ color: '#FF9900', marginTop: Spacing.two }}>
                        TOP PINECONE RAG MEMORY MATCHES
                      </ThemedText>
                      {trade.rag_matches.map((m, idx) => (
                        <View key={idx} style={styles.ragBox}>
                          <ThemedText type="smallBold" style={{ color: m.outcome === 'WIN' ? '#00E676' : '#FF1744', fontSize: 11 }}>
                            Match #{idx + 1}: {m.outcome} ({m.pnl_pct >= 0 ? '+' : ''}{m.pnl_pct.toFixed(1)}%)
                          </ThemedText>
                          <ThemedText type="small" style={{ fontSize: 11 }}>Worked: {m.what_worked}</ThemedText>
                        </View>
                      ))}

                      {/* Sonnet Post-Trade Reflection */}
                      {trade.reflection && (
                        <View style={{ marginTop: Spacing.two }}>
                          <ThemedText type="smallBold" style={{ color: '#FF9900' }}>
                            CLAUDE SONNET POST-TRADE REFLECTION
                          </ThemedText>
                          <ThemedText type="small" style={{ fontSize: 11, marginTop: 2 }}>
                            • Worked: {trade.reflection.what_worked}
                          </ThemedText>
                          <ThemedText type="small" style={{ fontSize: 11 }}>
                            • Failed: {trade.reflection.what_failed}
                          </ThemedText>
                          {trade.reflection.rule_update && (
                            <ThemedText type="smallBold" style={{ fontSize: 11, color: '#00E676', marginTop: 2 }}>
                              • Genome Rule Candidate: {trade.reflection.rule_update}
                            </ThemedText>
                          )}
                        </View>
                      )}

                    </View>
                  )}

                </ThemedView>
              </TouchableOpacity>
            );
          })}

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
  filterHeader: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
    backgroundColor: '#161719',
    borderBottomWidth: 1,
    borderBottomColor: '#2D3035',
  },
  filterChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.four,
    backgroundColor: '#2A2C30',
  },
  filterChipActive: {
    backgroundColor: '#FF9900',
  },
  scrollContent: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  tradeCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: '#161719',
    borderWidth: 1,
    borderColor: '#2D3035',
    gap: Spacing.two,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  dirBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Spacing.half,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.one,
    borderTopWidth: 1,
    borderTopColor: '#25272B',
  },
  expandedSection: {
    marginTop: Spacing.one,
  },
  divider: {
    height: 1,
    backgroundColor: '#2D3035',
    marginBottom: Spacing.two,
  },
  reasoningText: {
    fontStyle: 'italic',
    opacity: 0.9,
    marginTop: 2,
  },
  ragBox: {
    backgroundColor: '#202226',
    padding: Spacing.two,
    borderRadius: Spacing.one,
    marginTop: Spacing.one,
    gap: 2,
  },
});
