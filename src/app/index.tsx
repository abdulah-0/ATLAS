import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, View, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { alpaca, AlpacaAccount } from '../services/alpaca';
import { regimeDetector, RegimeResult } from '../services/regime';
import { secureStore, SECURE_KEYS } from '../services/secureStore';

// Types for Home state
interface HomeState {
  loading: boolean;
  isDemoMode: boolean;
  account: {
    portfolioValue: number;
    cash: number;
    buyingPower: number;
    dailyPlUsd: number;
    dailyPlPct: number;
  };
  regime: RegimeResult;
  btcPrice: number;
  btcChange24h: number;
  news: Array<{ headline: string; sentiment: string; time: string }>;
}

export default function HomeScreen() {
  const [state, setState] = useState<HomeState>({
    loading: true,
    isDemoMode: true,
    account: {
      portfolioValue: 12500.00,
      cash: 2500.00,
      buyingPower: 5000.00,
      dailyPlUsd: 154.20,
      dailyPlPct: 1.25,
    },
    regime: {
      regime: 'BULL',
      confidence: 0.82,
      volatility: 0.0145,
      priceToSmaRatio: 1.024,
    },
    btcPrice: 67420.00,
    btcChange24h: 2.45,
    news: [
      { headline: 'SEC Approves Spot Bitcoin Options for Multiple Exchanges', sentiment: 'BULLISH', time: '10m ago' },
      { headline: 'US Inflation Data Matches Expectations, Markets Rally', sentiment: 'BULLISH', time: '45m ago' },
      { headline: 'Whale Transfers 1,500 BTC to Cold Storage, Supply Tightens', sentiment: 'NEUTRAL', time: '2h ago' }
    ]
  });

  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const apiKey = await secureStore.getItem(SECURE_KEYS.ALPACA_API_KEY);
      const secretKey = await secureStore.getItem(SECURE_KEYS.ALPACA_SECRET_KEY);

      if (!apiKey || !secretKey) {
        // No keys configured, stay in demo mode with preloaded mock data
        setState(prev => ({ ...prev, loading: false, isDemoMode: true }));
        return;
      }

      // Try fetching live Alpaca account data
      const acc = await alpaca.getAccount();
      
      // Calculate daily P&L
      const portfolioValue = parseFloat(acc.portfolio_value);
      const lastEquity = parseFloat(acc.last_equity);
      const dailyPlUsd = portfolioValue - lastEquity;
      const dailyPlPct = lastEquity > 0 ? (dailyPlUsd / lastEquity) * 100 : 0;

      // Fetch historical BTC bars for regime detection
      let liveRegime = state.regime;
      let btcPrice = state.btcPrice;
      let btcChange24h = state.btcChange24h;

      try {
        const btcBars = await alpaca.getBars('BTC/USD', 'crypto', '1Hour', 100);
        if (btcBars && btcBars.length >= 50) {
          liveRegime = regimeDetector.detectRegime(btcBars);
          const latestBar = btcBars[btcBars.length - 1];
          btcPrice = latestBar.c;
          
          // Estimate 24h change from 24 bars ago
          if (btcBars.length >= 24) {
            const bar24hAgo = btcBars[btcBars.length - 24];
            btcChange24h = ((latestBar.c - bar24hAgo.c) / bar24hAgo.c) * 100;
          }
        }
      } catch (err) {
        console.warn('Could not fetch live BTC bars for regime:', err instanceof Error ? err.message : String(err));
      }

      // Fetch latest news
      let liveNews = state.news;
      try {
        const rawNews = await alpaca.getNews(['BTC'], 3);
        if (rawNews && rawNews.length > 0) {
          liveNews = rawNews.map((n: any) => ({
            headline: n.headline,
            sentiment: n.summary && n.summary.toLowerCase().includes('bull') ? 'BULLISH' : 
                       n.summary && n.summary.toLowerCase().includes('bear') ? 'BEARISH' : 'NEUTRAL',
            time: 'Live'
          }));
        }
      } catch (err) {
        console.warn('Could not fetch live news:', err instanceof Error ? err.message : String(err));
      }

      setState({
        loading: false,
        isDemoMode: false,
        account: {
          portfolioValue,
          cash: parseFloat(acc.cash),
          buyingPower: parseFloat(acc.buying_power),
          dailyPlUsd,
          dailyPlPct,
        },
        regime: liveRegime,
        btcPrice,
        btcChange24h,
        news: liveNews
      });

    } catch (error) {
      console.error('Error fetching live Alpaca data, falling back to Demo Mode:', error instanceof Error ? error.message : String(error));
      setState(prev => ({ ...prev, loading: false, isDemoMode: true }));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (state.loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9900" />
        <ThemedText style={{ marginTop: Spacing.two }}>Connecting to Mission Control...</ThemedText>
      </ThemedView>
    );
  }

  // Progress calculations towards 20 BTC
  const btcHolding = state.account.portfolioValue / state.btcPrice;
  const targetBtc = 20;
  const btcProgressPct = Math.min(100, (btcHolding / targetBtc) * 100);

  // Styling helper for colors
  const isGain = state.account.dailyPlUsd >= 0;
  const plColor = isGain ? '#00E676' : '#FF1744';
  const btcGain = state.btcChange24h >= 0;

  // Regime styling
  const getRegimeColor = (r: string) => {
    switch (r) {
      case 'BULL': return '#00E676';
      case 'BEAR': return '#FF1744';
      case 'CRASH': return '#FF9100';
      case 'EUPHORIA': return '#D500F9';
      default: return '#9E9E9E';
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        
        {state.isDemoMode && (
          <View style={styles.demoBanner}>
            <ThemedText style={styles.demoText} type="smallBold">
              DEMO MODE • Configure Alpaca API keys in Settings to connect live paper trading
            </ThemedText>
          </View>
        )}

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF9900" />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <ThemedText type="small" style={{ opacity: 0.6 }}>ATLAS MISSION CONTROL</ThemedText>
              <ThemedText type="subtitle">Autonomous Trading Engine</ThemedText>
            </View>
            <View style={[styles.regimeBadge, { borderColor: getRegimeColor(state.regime.regime) }]}>
              <View style={[styles.regimeDot, { backgroundColor: getRegimeColor(state.regime.regime) }]} />
              <ThemedText type="smallBold" style={{ color: getRegimeColor(state.regime.regime) }}>
                {state.regime.regime} ({(state.regime.confidence * 100).toFixed(0)}%)
              </ThemedText>
            </View>
          </View>

          {/* 20 BTC Hero Progress Bar */}
          <ThemedView type="backgroundElement" style={styles.heroCard}>
            <View style={styles.heroRow}>
              <ThemedText type="smallBold" style={styles.heroTitle}>20 BTC NORTH STAR TARGET</ThemedText>
              <ThemedText type="smallBold" style={styles.heroPercent}>{btcProgressPct.toFixed(4)}%</ThemedText>
            </View>
            <ThemedText type="title" style={styles.heroMainVal}>
              {btcHolding.toFixed(4)} <ThemedText type="subtitle" style={{ color: '#FF9900' }}>BTC</ThemedText>
            </ThemedText>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${Math.max(3, btcProgressPct)}%` }]} />
            </View>
            <View style={styles.progressLabels}>
              <ThemedText type="small" style={{ opacity: 0.6 }}>0 BTC</ThemedText>
              <ThemedText type="small" style={{ opacity: 0.6 }}>Goal: 20 BTC</ThemedText>
            </View>
          </ThemedView>

          {/* Account Metrics Card */}
          <View style={styles.metricsRow}>
            <ThemedView type="backgroundElement" style={[styles.metricCard, { flex: 1.3 }]}>
              <ThemedText type="small" style={{ opacity: 0.6 }}>PORTFOLIO VALUE</ThemedText>
              <ThemedText type="subtitle" style={styles.metricVal}>
                ${state.account.portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </ThemedText>
              <ThemedText type="smallBold" style={{ color: plColor }}>
                {isGain ? '+' : ''}${state.account.dailyPlUsd.toFixed(2)} ({isGain ? '+' : ''}{state.account.dailyPlPct.toFixed(2)}%) Today
              </ThemedText>
            </ThemedView>

            <ThemedView type="backgroundElement" style={[styles.metricCard, { flex: 1 }]}>
              <ThemedText type="small" style={{ opacity: 0.6 }}>BTC PRICE</ThemedText>
              <ThemedText type="subtitle" style={[styles.metricVal, { color: '#FF9900' }]}>
                ${state.btcPrice.toLocaleString()}
              </ThemedText>
              <ThemedText type="smallBold" style={{ color: btcGain ? '#00E676' : '#FF1744' }}>
                {btcGain ? '▲' : '▼'} {state.btcChange24h.toFixed(2)}% (24h)
              </ThemedText>
            </ThemedView>
          </View>

          {/* Quick Stats Grid */}
          <View style={styles.sectionHeader}>
            <ThemedText type="smallBold" style={{ opacity: 0.7 }}>TODAY'S LEDGER STATS</ThemedText>
          </View>
          <ThemedView type="backgroundElement" style={styles.statsRow}>
            <View style={styles.statCol}>
              <ThemedText type="small" style={{ opacity: 0.5 }}>TRADES</ThemedText>
              <ThemedText type="default" style={{ fontWeight: 'bold' }}>0</ThemedText>
            </View>
            <View style={styles.statCol}>
              <ThemedText type="small" style={{ opacity: 0.5 }}>WIN RATE</ThemedText>
              <ThemedText type="default" style={{ fontWeight: 'bold' }}>-- %</ThemedText>
            </View>
            <View style={styles.statCol}>
              <ThemedText type="small" style={{ opacity: 0.5 }}>BUY POWER</ThemedText>
              <ThemedText type="default" style={{ fontSize: 13, fontWeight: 'bold' }}>${state.account.buyingPower.toLocaleString()}</ThemedText>
            </View>
            <View style={styles.statCol}>
              <ThemedText type="small" style={{ opacity: 0.5 }}>CASH</ThemedText>
              <ThemedText type="default" style={{ fontSize: 13, fontWeight: 'bold' }}>${state.account.cash.toLocaleString()}</ThemedText>
            </View>
          </ThemedView>

          {/* Seed Bots status */}
          <View style={styles.sectionHeader}>
            <ThemedText type="smallBold" style={{ opacity: 0.7 }}>DARWINIAN SEED BOTS</ThemedText>
          </View>

          {/* Bot 1 */}
          <ThemedView type="backgroundElement" style={styles.botCard}>
            <View style={styles.botRow}>
              <View>
                <ThemedText type="default" style={{ fontWeight: 'bold' }}>atlas_001 • Momentum Hunter</ThemedText>
                <ThemedText type="small" style={{ opacity: 0.6 }}>Gen 1 • BTC, ETH, NVDA • 15min</ThemedText>
              </View>
              <View style={styles.botStatusBadge}>
                <ThemedText type="smallBold" style={{ color: '#FF9100' }}>STANDBY</ThemedText>
              </View>
            </View>
            <ThemedText type="small" style={{ marginTop: Spacing.one, opacity: 0.8 }}>
              Active in BULL, EUPHORIA regimes. Position sizing capped at 20%.
            </ThemedText>
          </ThemedView>

          {/* Bot 2 */}
          <ThemedView type="backgroundElement" style={styles.botCard}>
            <View style={styles.botRow}>
              <View>
                <ThemedText type="default" style={{ fontWeight: 'bold' }}>atlas_002 • Mean Reversion</ThemedText>
                <ThemedText type="small" style={{ opacity: 0.6 }}>Gen 1 • BTC, ETH • 1h</ThemedText>
              </View>
              <View style={styles.botStatusBadge}>
                <ThemedText type="smallBold" style={{ color: '#FF9100' }}>STANDBY</ThemedText>
              </View>
            </View>
            <ThemedText type="small" style={{ marginTop: Spacing.one, opacity: 0.8 }}>
              Active in NEUTRAL, BEAR regimes. Targets VWAP deviation & RSI oversold.
            </ThemedText>
          </ThemedView>

          {/* News Digest Ticker */}
          <View style={styles.sectionHeader}>
            <ThemedText type="smallBold" style={{ opacity: 0.7 }}>NEWS INTELLIGENCE PULSE</ThemedText>
          </View>
          <ThemedView type="backgroundElement" style={styles.newsCard}>
            {state.news.map((item, idx) => (
              <View key={idx} style={[styles.newsItem, idx < state.news.length - 1 && styles.newsBorder]}>
                <View style={styles.newsMeta}>
                  <ThemedText type="smallBold" style={{ 
                    color: item.sentiment === 'BULLISH' ? '#00E676' : 
                           item.sentiment === 'BEARISH' ? '#FF1744' : '#B0B4BA' 
                  }}>
                    {item.sentiment}
                  </ThemedText>
                  <ThemedText type="small" style={{ opacity: 0.5 }}>{item.time}</ThemedText>
                </View>
                <ThemedText type="default" style={styles.newsHeadline}>{item.headline}</ThemedText>
              </View>
            ))}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  demoBanner: {
    backgroundColor: '#FF9100',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
  },
  demoText: {
    color: '#000000',
    textAlign: 'center',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  regimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Spacing.four,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    gap: Spacing.one,
  },
  regimeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  heroCard: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    backgroundColor: '#161719',
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: '#2D3035',
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroTitle: {
    opacity: 0.6,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  heroPercent: {
    color: '#FF9900',
  },
  heroMainVal: {
    fontSize: 28,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2E3135',
    overflow: 'hidden',
    marginTop: Spacing.one,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#FF9900',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  metricCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: '#161719',
    borderWidth: 1,
    borderColor: '#2D3035',
    gap: Spacing.one,
  },
  metricVal: {
    fontSize: 20,
  },
  sectionHeader: {
    marginTop: Spacing.one,
  },
  statsRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: '#161719',
    borderWidth: 1,
    borderColor: '#2D3035',
    justifyContent: 'space-between',
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  botCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: '#161719',
    borderWidth: 1,
    borderColor: '#2D3035',
    gap: Spacing.one,
  },
  botRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  botStatusBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.one,
    backgroundColor: '#2E2F32',
  },
  newsCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: '#161719',
    borderWidth: 1,
    borderColor: '#2D3035',
  },
  newsItem: {
    paddingVertical: Spacing.two,
  },
  newsBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#2D3035',
  },
  newsMeta: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.half,
  },
  newsHeadline: {
    fontSize: 13,
    lineHeight: 18,
  },
});
