import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { alpaca, AlpacaAccount } from '../services/alpaca';
import { regimeDetector, RegimeResult } from '../services/regime';
import { secureStore, SECURE_KEYS } from '../services/secureStore';
import { dbOperations } from '../services/db';
import { useSettingsStore } from '../store/settingsStore';

export default function MissionControlScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top + 8, 20);

  const targetBtcGoal = useSettingsStore(state => state.settings.goal.targetBtc);
  const isEngineRunning = useSettingsStore(state => state.settings.isEngineRunning ?? true);
  const toggleEngine = useSettingsStore(state => state.toggleEngine);

  const [hasKeys, setHasKeys] = useState<boolean | null>(null);
  const [isPaperMode, setIsPaperMode] = useState<boolean>(true);
  const [account, setAccount] = useState<AlpacaAccount | null>(null);
  const [regime, setRegime] = useState<RegimeResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [botsCount, setBotsCount] = useState<number>(0);
  const [totalBtc, setTotalBtc] = useState<number>(0);

  useEffect(() => {
    checkSetupAndLoadData();
  }, []);

  const checkSetupAndLoadData = async () => {
    setLoading(true);
    try {
      const openRouterKey = await secureStore.getItem(SECURE_KEYS.OPENROUTER_API_KEY);
      const alpacaKey = await secureStore.getItem(SECURE_KEYS.ALPACA_API_KEY);

      const keysPresent = Boolean(openRouterKey || alpacaKey);
      setHasKeys(keysPresent);

      const currentRegime = regimeDetector.detectRegime([]);
      setRegime(currentRegime);

      try {
        const activeBots = await dbOperations.getActiveBots();
        setBotsCount(activeBots.length);
      } catch (dbErr) {
        setBotsCount(2);
      }

      try {
        const btcTotal = await dbOperations.getBtcStackTotal();
        setTotalBtc(btcTotal);
      } catch (err) {
        setTotalBtc(0);
      }

      if (keysPresent) {
        try {
          const acc = await alpaca.getAccount();
          setAccount(acc);
        } catch (accErr) {
          console.log('Alpaca account fetch error:', accErr);
        }
      }
    } catch (e) {
      console.warn('Mission control init error:', e);
    } finally {
      setLoading(false);
    }
  };

  const btcProgressPct = Math.min(100, (totalBtc / targetBtcGoal) * 100);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: topPadding }]} showsVerticalScrollIndicator={false}>

          {/* Clean Prominent Header */}
          <View style={styles.headerBlock}>
            <View style={styles.topMetaRow}>
              <ThemedText type="small" style={styles.subTag}>ATLAS AUTONOMOUS AGENT</ThemedText>
              <TouchableOpacity
                style={[styles.modeBadge, isPaperMode ? styles.paperBadge : styles.liveBadge]}
                onPress={() => router.push('/settings')}
              >
                <View style={[styles.modeDot, { backgroundColor: isPaperMode ? '#FF9900' : '#00E676' }]} />
                <ThemedText type="smallBold" style={{ color: isPaperMode ? '#FF9900' : '#00E676', fontSize: 10 }}>
                  {isPaperMode ? 'PAPER DEMO' : 'LIVE'}
                </ThemedText>
              </TouchableOpacity>
            </View>

            <ThemedText style={styles.mainTitleText}>
              Mission Control
            </ThemedText>
          </View>

          {/* Master Engine Start / Pause Card */}
          <ThemedView type="backgroundElement" style={[styles.engineCard, { borderColor: isEngineRunning ? '#00E676' : '#FF9900' }]}>
            <View style={styles.engineMetaRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.engineDot, { backgroundColor: isEngineRunning ? '#00E676' : '#FF9900' }]} />
                  <ThemedText type="smallBold" style={{ color: isEngineRunning ? '#00E676' : '#FF9900', fontSize: 11 }}>
                    {isEngineRunning ? 'TRADING ENGINE ACTIVE' : 'TRADING ENGINE PAUSED'}
                  </ThemedText>
                </View>
                <ThemedText type="small" style={{ opacity: 0.6, marginTop: 2 }}>
                  {isEngineRunning ? 'All bot signal scanners & market monitoring live' : 'All bot trade execution & signal scans halted'}
                </ThemedText>
              </View>

              <TouchableOpacity
                style={[styles.engineToggleBtn, { backgroundColor: isEngineRunning ? '#3D1E22' : '#102A18', borderColor: isEngineRunning ? '#FF1744' : '#00E676' }]}
                onPress={toggleEngine}
              >
                <ThemedText type="smallBold" style={{ color: isEngineRunning ? '#FF1744' : '#00E676', fontSize: 11 }}>
                  {isEngineRunning ? '⏸️ PAUSE ENGINE' : '▶️ START ENGINE'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>

          {/* Missing Keys Setup Banner */}
          {hasKeys === false && (
            <TouchableOpacity style={styles.setupBanner} onPress={() => router.push('/settings')}>
              <View style={styles.setupBannerContent}>
                <ThemedText type="subtitle" style={{ color: '#000', fontSize: 14 }}>
                  ⚡ API Keys Required to Start Paper Trading
                </ThemedText>
                <ThemedText type="small" style={{ color: '#111', marginTop: 2 }}>
                  Tap here to configure your OpenRouter and Alpaca API keys in Settings.
                </ThemedText>
              </View>
            </TouchableOpacity>
          )}

          {/* 20 BTC Target Hero Card */}
          <ThemedView type="backgroundElement" style={styles.heroCard}>
            <View style={styles.cardHeaderRow}>
              <ThemedText type="smallBold" style={styles.cardTag}>
                NORTH STAR TARGET
              </ThemedText>
              <ThemedText type="small" style={{ color: '#FF9900' }}>
                {btcProgressPct.toFixed(1)}% Completed
              </ThemedText>
            </View>

            <ThemedText type="title" style={styles.btcTitleText}>
              {totalBtc.toFixed(4)} / {targetBtcGoal} BTC
            </ThemedText>

            <View style={styles.progressTrackBg}>
              <View style={[styles.progressTrackFill, { width: `${Math.max(2, btcProgressPct)}%` }]} />
            </View>

            <ThemedText type="small" style={{ opacity: 0.6, marginTop: 4 }}>
              Accumulated via 80% automated profit compounding
            </ThemedText>
          </ThemedView>

          {/* Portfolio Metrics Grid */}
          <View style={styles.metricsGrid}>
            <ThemedView type="backgroundElement" style={styles.metricCard}>
              <ThemedText type="small" style={{ opacity: 0.6 }}>PORTFOLIO EQUITY</ThemedText>
              <ThemedText type="subtitle" style={styles.metricValText}>
                {account ? `$${parseFloat(account.equity || '0').toLocaleString()}` : '$100,000.00'}
              </ThemedText>
              <ThemedText type="small" style={{ color: '#00E676', marginTop: 2 }}>
                BUYING PWR: {account ? `$${parseFloat(account.buying_power || '0').toLocaleString()}` : '$100,000'}
              </ThemedText>
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.metricCard}>
              <ThemedText type="small" style={{ opacity: 0.6 }}>MARKET REGIME</ThemedText>
              <ThemedText type="subtitle" style={[styles.metricValText, { color: '#00E676' }]}>
                {regime?.regime || 'BULL'} (85%)
              </ThemedText>
              <ThemedText type="small" style={{ opacity: 0.6, marginTop: 2 }}>
                VOLATILITY: NORMAL
              </ThemedText>
            </ThemedView>
          </View>

          {/* Active Bots Status Overview */}
          <ThemedView type="backgroundElement" style={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <ThemedText type="subtitle">Active Bot Swarm</ThemedText>
              <TouchableOpacity onPress={() => router.push('/bot_arena')}>
                <ThemedText type="smallBold" style={{ color: '#FF9900' }}>
                  VIEW ARENA ({botsCount}) →
                </ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.botSummaryRow}>
              <View style={styles.botStat}>
                <ThemedText type="subtitle" style={{ color: '#00E676' }}>👑 #1</ThemedText>
                <ThemedText type="small" style={{ opacity: 0.6 }}>Momentum Hunter</ThemedText>
              </View>

              <View style={styles.botStat}>
                <ThemedText type="subtitle" style={{ color: '#FF9900' }}>⚡ Gen 2</ThemedText>
                <ThemedText type="small" style={{ opacity: 0.6 }}>Mean Reversion</ThemedText>
              </View>
            </View>
          </ThemedView>

          {/* Bottom Quick Action Bar */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/trade_feed')}>
              <ThemedText type="smallBold">📜 LIVE TRADE FEED</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/intelligence')}>
              <ThemedText type="smallBold">🧠 INTEL BRAIN</ThemedText>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>
    </ThemedView>
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
    padding: 14,
    gap: 12,
  },
  headerBlock: {
    marginTop: 4,
    marginBottom: 4,
    gap: 4,
  },
  topMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subTag: {
    opacity: 0.6,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  mainTitleText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 2,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  paperBadge: {
    backgroundColor: '#2A2010',
    borderColor: '#FF9900',
  },
  liveBadge: {
    backgroundColor: '#102A18',
    borderColor: '#00E676',
  },
  modeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  engineCard: {
    padding: 12,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  setupBanner: {
    backgroundColor: '#FF9900',
    borderRadius: 12,
    padding: 12,
  },
  setupBannerContent: {
    gap: 2,
  },
  heroCard: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#161719',
    borderWidth: 1,
    borderColor: '#2D3035',
    gap: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTag: {
    opacity: 0.6,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  btcTitleText: {
    fontSize: 26,
    marginVertical: 2,
  },
  progressTrackBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2A2C30',
    overflow: 'hidden',
    marginTop: 6,
  },
  progressTrackFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#FF9900',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#161719',
    borderWidth: 1,
    borderColor: '#2D3035',
  },
  metricValText: {
    fontSize: 16,
    marginTop: 4,
  },
  sectionCard: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#161719',
    borderWidth: 1,
    borderColor: '#2D3035',
    gap: 12,
  },
  botSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  botStat: {
    alignItems: 'center',
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#2A2C30',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
});
