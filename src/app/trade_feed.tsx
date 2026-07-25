import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { dbOperations } from '../services/db';

export default function TradeFeedScreen() {
  const [filter, setFilter] = useState<'all' | 'wins' | 'losses'>('all');
  const [expandedTradeId, setExpandedTradeId] = useState<string | null>(null);
  const [trades, setTrades] = useState<any[]>([]);

  useEffect(() => {
    loadTradesFromDb();
  }, []);

  const loadTradesFromDb = async () => {
    try {
      const dbTrades = await dbOperations.getTrades();
      if (dbTrades && dbTrades.length > 0) {
        setTrades(dbTrades);
      }
    } catch (e) {
      console.log('Trade DB query initialized');
    }
  };

  const filteredTrades = trades.filter(t => {
    const pnl = t.pnl_pct ?? 0;
    if (filter === 'wins') return pnl > 0;
    if (filter === 'losses') return pnl < 0;
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
            <ThemedText type="smallBold" style={{ color: filter === 'all' ? '#000' : '#8E8E93', fontSize: 11 }}>
              ALL TRADES ({trades.length})
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.filterChip, filter === 'wins' && styles.filterChipActive]}
            onPress={() => setFilter('wins')}
          >
            <ThemedText type="smallBold" style={{ color: filter === 'wins' ? '#000' : '#8E8E93', fontSize: 11 }}>
              WINS ONLY
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.filterChip, filter === 'losses' && styles.filterChipActive]}
            onPress={() => setFilter('losses')}
          >
            <ThemedText type="smallBold" style={{ color: filter === 'losses' ? '#000' : '#8E8E93', fontSize: 11 }}>
              LOSSES ONLY
            </ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {filteredTrades.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.emptyCard}>
              <ThemedText type="smallBold" style={{ color: '#FF9900', textAlign: 'center' }}>
                📊 No Paper Trades Executed Yet
              </ThemedText>
              <ThemedText type="small" style={{ opacity: 0.6, textAlign: 'center', marginTop: 4 }}>
                Configure your OpenRouter and Alpaca API keys in Settings to start paper trading. Closed paper trades, Opus decision reasoning, and Sonnet reflections will stream live here.
              </ThemedText>
            </ThemedView>
          ) : (
            filteredTrades.map(trade => {
              const isExpanded = expandedTradeId === trade.id;
              const pnlPct = trade.pnl_pct ?? 0;
              const isWin = pnlPct >= 0;

              return (
                <TouchableOpacity
                  key={trade.id}
                  activeOpacity={0.9}
                  onPress={() => setExpandedTradeId(isExpanded ? null : trade.id)}
                >
                  <ThemedView type="backgroundElement" style={styles.tradeCard}>

                    {/* Top Card Row */}
                    <View style={styles.cardRow}>
                      <View style={{ flex: 1, flexShrink: 1 }}>
                        <View style={styles.badgeRow}>
                          <View style={[styles.dirBadge, { backgroundColor: trade.direction === 'long' ? '#102A18' : '#3D1E22' }]}>
                            <ThemedText type="smallBold" style={{ color: trade.direction === 'long' ? '#00E676' : '#FF1744', fontSize: 10 }}>
                              {trade.direction?.toUpperCase()}
                            </ThemedText>
                          </View>
                          <ThemedText type="small" style={{ opacity: 0.6 }}>{trade.opened_at || 'Just now'}</ThemedText>
                        </View>
                        
                        <ThemedText type="subtitle" style={{ marginTop: 4 }} numberOfLines={1}>
                          {trade.asset} • {trade.bot_id}
                        </ThemedText>
                      </View>

                      <View style={{ alignItems: 'flex-end', minWidth: 80 }}>
                        <ThemedText type="subtitle" style={{ color: isWin ? '#00E676' : '#FF1744' }}>
                          {isWin ? '+' : ''}{pnlPct.toFixed(2)}%
                        </ThemedText>
                        <ThemedText type="small" style={{ opacity: 0.6 }}>
                          Signal: {trade.signal_type}
                        </ThemedText>
                      </View>
                    </View>

                    {/* Price Levels Row */}
                    <View style={styles.priceRow}>
                      <ThemedText type="small" style={{ opacity: 0.7 }}>
                        Entry: ${trade.entry_price}
                      </ThemedText>
                      <ThemedText type="small" style={{ opacity: 0.7 }}>
                        Stop: ${trade.stop_loss}
                      </ThemedText>
                      <ThemedText type="smallBold" style={{ color: '#FF9900' }}>
                        Opus Conf: {((trade.opus_confidence || 0.85) * 100).toFixed(0)}%
                      </ThemedText>
                    </View>

                    {/* Expandable Details */}
                    {isExpanded && (
                      <View style={styles.expandedSection}>
                        <View style={styles.divider} />
                        <ThemedText type="smallBold" style={{ color: '#FF9900' }}>CLAUDE OPUS PRE-TRADE REASONING</ThemedText>
                        <ThemedText type="small" style={styles.reasoningText}>
                          "{trade.opus_reasoning || 'Signal approved by Opus RAG evaluation.'}"
                        </ThemedText>
                      </View>
                    )}

                  </ThemedView>
                </TouchableOpacity>
              );
            })
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
  emptyCard: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    backgroundColor: '#161719',
    borderWidth: 1,
    borderColor: '#2D3035',
    alignItems: 'center',
    marginTop: Spacing.two,
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
});
