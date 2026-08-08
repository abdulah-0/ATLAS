import React, { Component, useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BotGenome } from '../types/genome';
import { SEED_GENOMES } from '../services/seedGenomes';
import { dbOperations } from '../services/db';
import { useSettingsStore } from '../store/settingsStore';

// Error Boundary to isolate and recover from any render error
interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class BotArenaErrorBoundary extends Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorMessage: error?.message || 'Unknown render error' };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.warn('BotArena ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ThemedView style={styles.container}>
          <SafeAreaView style={styles.safeArea}>
            <View style={{ flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
              <ThemedText type="smallBold" style={{ color: '#FF1744', fontSize: 18 }}>
                ⚠️ Bot Arena Recovery Mode
              </ThemedText>
              <ThemedText type="small" style={{ opacity: 0.7, textAlign: 'center' }}>
                An isolated UI event occurred: {this.state.errorMessage}
              </ThemedText>
              <TouchableOpacity
                style={{ backgroundColor: '#21262D', borderWidth: 1, borderColor: '#30363D', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginTop: 10 }}
                onPress={() => this.setState({ hasError: false, errorMessage: '' })}
              >
                <ThemedText type="smallBold" style={{ color: '#FF9900' }}>
                  RELOAD BOT ARENA
                </ThemedText>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </ThemedView>
      );
    }
    return this.props.children;
  }
}

function BotArenaContent() {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top + 8, 20);

  const isEngineRunning = useSettingsStore(state => state.settings?.isEngineRunning ?? true);
  const toggleEngine = useSettingsStore(state => state.toggleEngine);
  const toggleBotPause = useSettingsStore(state => state.toggleBotPause);
  const pausedBotIds = useSettingsStore(state => state.settings?.pausedBotIds || []);

  const [expandedBotId, setExpandedBotId] = useState<string | null>(null);
  const [bots, setBots] = useState<BotGenome[]>(SEED_GENOMES);

  useEffect(() => {
    loadBotsFromDb();
  }, []);

  const loadBotsFromDb = async () => {
    try {
      const dbBots = await dbOperations.getActiveBots();
      if (dbBots && dbBots.length > 0) {
        const parsed: BotGenome[] = [];
        for (const row of dbBots) {
          try {
            if (row.genome) {
              const g = typeof row.genome === 'string' ? JSON.parse(row.genome) : row.genome;
              const botId = g?.bot_id || g?.id || row?.id || row?.bot_id;
              if (g && botId) {
                parsed.push({ ...g, bot_id: botId });
                continue;
              }
            }
            const rowId = row?.id || row?.bot_id;
            if (rowId) {
              const seed = SEED_GENOMES.find(s => s.bot_id === rowId);
              if (seed) parsed.push(seed);
            }
          } catch (parseErr) {
            console.warn('Error parsing bot genome row:', parseErr);
          }
        }
        if (parsed.length > 0) {
          setBots(parsed);
        }
      }
    } catch (e) {
      console.log('Using default seed genomes for Bot Arena UI');
    }
  };

  const activeBotCount = Math.max(0, bots.length - (pausedBotIds?.length || 0));

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: topPadding }]} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="small" style={{ opacity: 0.6 }}>DARWINIAN BOT ARENA</ThemedText>
            <ThemedText type="subtitle">Active Genomes & Life-Cycle</ThemedText>
          </View>

          {/* Master Engine Control Banner */}
          <ThemedView type="backgroundElement" style={[styles.engineCard, { borderColor: isEngineRunning ? '#00E676' : '#FF9900' }]}>
            <View style={styles.engineMetaRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.engineDot, { backgroundColor: isEngineRunning ? '#00E676' : '#FF9900' }]} />
                  <ThemedText type="smallBold" style={{ color: isEngineRunning ? '#00E676' : '#FF9900', fontSize: 11 }}>
                    {isEngineRunning ? 'ENGINE RUNNING' : 'ENGINE PAUSED'}
                  </ThemedText>
                </View>
                <ThemedText type="small" style={{ opacity: 0.6, marginTop: 2 }}>
                  {isEngineRunning ? `${activeBotCount}/${bots.length} Bots Active` : 'All Trading Scanners Paused'}
                </ThemedText>
              </View>

              <TouchableOpacity
                style={[styles.engineToggleBtn, { backgroundColor: isEngineRunning ? '#3D1E22' : '#102A18', borderColor: isEngineRunning ? '#FF1744' : '#00E676' }]}
                onPress={toggleEngine}
              >
                <ThemedText type="smallBold" style={{ color: isEngineRunning ? '#FF1744' : '#00E676', fontSize: 10 }}>
                  {isEngineRunning ? 'PAUSE ALL' : 'START ALL'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>

          {/* Active Bot Cards */}
          {bots.map((bot, index) => {
            if (!bot || !bot.bot_id) return null;

            const isExpanded = expandedBotId === bot.bot_id;
            const healthScore = 85;
            const isChampion = index === 0;
            const primaryAsset = String(bot.asset_universe?.[0] || 'BTC/USD');
            const isPaused = (pausedBotIds || []).includes(bot.bot_id) || !isEngineRunning;
            const signalType = String(bot.entry?.primary_signal || 'momentum');
            const timeframe = String(bot.preferred_timeframe || '15min');
            const botTitle = String(bot.nickname || bot.bot_id);

            return (
              <TouchableOpacity
                key={bot.bot_id}
                activeOpacity={0.9}
                onPress={() => setExpandedBotId(isExpanded ? null : bot.bot_id)}
              >
                <ThemedView type="backgroundElement" style={[styles.botCard, isPaused && styles.botCardPaused]}>
                  
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
                          Gen {bot.generation ?? 1} • {primaryAsset}
                        </ThemedText>
                      </View>

                      <ThemedText type="default" style={[styles.botTitleText, { fontWeight: '700', fontSize: 16 }]} numberOfLines={1}>
                        {botTitle} ({bot.bot_id})
                      </ThemedText>
                    </View>

                    <View style={{ alignItems: 'flex-end', gap: 4, minWidth: 90 }}>
                      <TouchableOpacity
                        style={[styles.botActionBtn, { backgroundColor: isPaused ? '#102A18' : '#3D1E22', borderColor: isPaused ? '#00E676' : '#FF1744' }]}
                        onPress={() => toggleBotPause(bot.bot_id)}
                      >
                        <ThemedText type="smallBold" style={{ color: isPaused ? '#00E676' : '#FF1744', fontSize: 10 }}>
                          {isPaused ? '▶️ START' : '⏸️ STOP'}
                        </ThemedText>
                      </TouchableOpacity>
                      <ThemedText type="small" style={{ opacity: 0.6, fontSize: 10 }}>
                        {isPaused ? 'Trading Paused' : 'Trading Active'}
                      </ThemedText>
                    </View>
                  </View>

                  {/* Health Progress Track */}
                  <View style={styles.healthTrackBg}>
                    <View style={[styles.healthTrackFill, { width: `${healthScore}%`, backgroundColor: isPaused ? '#6E7681' : healthScore > 50 ? '#00E676' : '#FF9100' }]} />
                  </View>

                  {/* Quick Metrics Row */}
                  <View style={styles.metricsRow}>
                    <View style={styles.metricItem}>
                      <ThemedText type="small" style={{ opacity: 0.5 }}>TIMEFRAME</ThemedText>
                      <ThemedText type="smallBold">{timeframe}</ThemedText>
                    </View>

                    <View style={styles.metricItem}>
                      <ThemedText type="small" style={{ opacity: 0.5 }}>SIGNAL TYPE</ThemedText>
                      <ThemedText type="smallBold" numberOfLines={1}>{signalType}</ThemedText>
                    </View>

                    <View style={styles.metricItem}>
                      <ThemedText type="small" style={{ opacity: 0.5 }}>STATUS</ThemedText>
                      <ThemedText type="smallBold" style={{ color: isPaused ? '#FF9100' : '#00E676' }}>
                        {isPaused ? 'PAUSED' : 'ACTIVE'}
                      </ThemedText>
                    </View>
                  </View>

                  {/* Expanded DNA Details */}
                  {isExpanded && (
                    <View style={styles.expandedSection}>
                      <View style={styles.divider} />
                      <ThemedText type="smallBold" style={{ color: '#FF9900' }}>ENTRY RULES & CONFLUENCE</ThemedText>
                      <ThemedText type="small" style={{ opacity: 0.8, marginTop: 2 }}>
                        {`• Primary Signal: ${String(bot.entry?.primary_signal || 'N/A')}`}
                      </ThemedText>
                      <ThemedText type="small" style={{ opacity: 0.8 }}>
                        {`• Min Signal Confidence: ${String(bot.entry?.min_confidence ?? 0.65)}`}
                      </ThemedText>

                      <ThemedText type="smallBold" style={{ color: '#FF9900', marginTop: 8 }}>EXIT & RISK BOUNDARIES</ThemedText>
                      <ThemedText type="small" style={{ opacity: 0.8, marginTop: 2 }}>
                        {`• Stop Loss: ${(bot.exit?.stop_loss_pct ? bot.exit.stop_loss_pct * 100 : 1.5).toFixed(1)}%`}
                      </ThemedText>
                      <ThemedText type="small" style={{ opacity: 0.8 }}>
                        {`• Take Profit R:R: 1:${String(bot.exit?.take_profit_rr || 2.5)}`}
                      </ThemedText>
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

export default function BotArenaScreen() {
  return (
    <BotArenaErrorBoundary>
      <BotArenaContent />
    </BotArenaErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101113',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    gap: 12,
  },
  header: {
    marginTop: 4,
  },
  engineCard: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#161719',
    borderWidth: 1,
  },
  engineMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  engineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  engineToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  botCard: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#161719',
    borderWidth: 1,
    borderColor: '#2D3035',
    gap: 8,
  },
  botCardPaused: {
    borderColor: '#D29922',
    opacity: 0.85,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  championBadge: {
    backgroundColor: '#FF9900',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  botTitleText: {
    marginTop: 2,
  },
  botActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  healthTrackBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2A2C30',
    overflow: 'hidden',
  },
  healthTrackFill: {
    height: '100%',
    borderRadius: 3,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#25272B',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  expandedSection: {
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#2D3035',
    marginBottom: 8,
  },
});
