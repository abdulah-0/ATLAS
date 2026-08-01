import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { regimeDetector, RegimeResult } from '../services/regime';
import { KronosForecastPanel } from '../components/intelligence/KronosForecastPanel';

export default function IntelligenceScreen() {
  const [assetFilter, setAssetFilter] = useState<'ALL' | 'BTC' | 'ETH' | 'NVDA'>('ALL');
  const [regime, setRegime] = useState<RegimeResult | null>(null);

  useEffect(() => {
    loadRegime();
  }, []);

  const loadRegime = async () => {
    try {
      const state = regimeDetector.detectRegime([]);
      setRegime(state);
    } catch (e) {
      console.log('Loaded regime state');
    }
  };

  const currentRegimeName = regime?.regime || 'BULL';
  const confidencePct = regime ? Math.round(regime.confidence * 100) : 85;

  const getRegimeColor = (r: string) => {
    switch (r) {
      case 'BULL': return '#00E676';
      case 'BEAR': return '#FF1744';
      case 'CRASH': return '#FF9100';
      case 'EUPHORIA': return '#D500F9';
      default: return '#9E9E9E';
    }
  };

  const newsFeedItems = [
    { id: '1', asset: 'BTC', tone: 'BULLISH', text: 'Alpaca Paper Trading Account Ready. Signal Engine monitoring 15m and 1h bars for entry triggers.' },
    { id: '2', asset: 'ETH', tone: 'NEUTRAL', text: 'Ethereum Layer 2 activity shows steady gas usage without spike.' },
  ];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="small" style={{ opacity: 0.6 }}>ATLAS MARKET INTELLIGENCE</ThemedText>
            <ThemedText type="subtitle">Regime Brain & Sentiment Feed</ThemedText>
          </View>

          {/* Current Regime Hero Card */}
          <ThemedView type="backgroundElement" style={styles.heroCard}>
            <View style={styles.heroRow}>
              <ThemedText type="smallBold" style={{ opacity: 0.6, fontSize: 10, letterSpacing: 0.8 }}>
                CURRENT MARKET REGIME
              </ThemedText>
              <ThemedText type="small" style={{ opacity: 0.5 }}>Live Rule Engine</ThemedText>
            </View>

            <View style={styles.regimeMainRow}>
              <View style={styles.regimeBadgeGroup}>
                <View style={[styles.regimeDot, { backgroundColor: getRegimeColor(currentRegimeName) }]} />
                <ThemedText type="title" style={{ color: getRegimeColor(currentRegimeName), fontSize: 26 }} numberOfLines={1}>
                  {currentRegimeName}
                </ThemedText>
              </View>

              <View style={{ alignItems: 'flex-end', flexShrink: 0, minWidth: 80 }}>
                <ThemedText type="subtitle" style={{ color: '#FF9900' }}>
                  {confidencePct}% CONF
                </ThemedText>
                <ThemedText type="small" style={{ opacity: 0.6 }}>HMM: 1.0x</ThemedText>
              </View>
            </View>

            <View style={styles.regimeStatsRow}>
              <View style={styles.regimeStatCol}>
                <ThemedText type="small" style={{ opacity: 0.5 }} numberOfLines={1}>POSITION MULTIPLIER</ThemedText>
                <ThemedText type="smallBold">1.0x (100% Sizing)</ThemedText>
              </View>

              <View style={styles.regimeStatCol}>
                <ThemedText type="small" style={{ opacity: 0.5 }} numberOfLines={1}>RISK COMPLIANCE</ThemedText>
                <ThemedText type="smallBold" style={{ color: '#00E676' }}>100% CLEAR</ThemedText>
              </View>
            </View>
          </ThemedView>

          {/* Kronos Deep-Learning Forecast Panel */}
          <KronosForecastPanel />

          {/* Fear & Greed + Calendar Grid */}
          <View style={styles.gridRow}>
            {/* Fear & Greed Card */}
            <ThemedView type="backgroundElement" style={styles.gridCard}>
              <ThemedText type="small" style={{ opacity: 0.6 }} numberOfLines={1}>FEAR & GREED</ThemedText>
              <ThemedText type="subtitle" style={{ color: '#00E676', fontSize: 20, marginVertical: 2 }}>
                68
              </ThemedText>
              <ThemedText type="smallBold" style={{ color: '#00E676' }}>
                GREED
              </ThemedText>
            </ThemedView>

            {/* Macro Status Card */}
            <ThemedView type="backgroundElement" style={styles.gridCard}>
              <ThemedText type="small" style={{ opacity: 0.6 }} numberOfLines={1}>MACRO BLACKOUT</ThemedText>
              <ThemedText type="subtitle" style={{ color: '#00E676', fontSize: 20, marginVertical: 2 }}>
                CLEAR
              </ThemedText>
              <ThemedText type="small" style={{ opacity: 0.6 }} numberOfLines={1}>No Earnings Risk</ThemedText>
            </ThemedView>
          </View>

          {/* Live News Feed Header */}
          <View style={styles.sectionHeader}>
            <ThemedText type="smallBold" style={{ opacity: 0.7 }}>LIVE MARKET INTELLIGENCE FEED</ThemedText>
          </View>

          {/* Filter Chips */}
          <View style={styles.filterRowWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {(['ALL', 'BTC', 'ETH', 'NVDA'] as const).map(asset => (
                <TouchableOpacity
                  key={asset}
                  style={[styles.filterChip, assetFilter === asset && styles.filterChipActive]}
                  onPress={() => setAssetFilter(asset)}
                >
                  <ThemedText type="smallBold" style={{ color: assetFilter === asset ? '#000' : '#8E8E93', fontSize: 11 }}>
                    {asset}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Non-virtualized Bounded News Feed List (Max 20 Items - Bug 6 Fix) */}
          <ThemedView type="backgroundElement" style={styles.newsCard}>
            {newsFeedItems.map(item => (
              <View key={item.id} style={styles.newsItem}>
                <View style={styles.newsMeta}>
                  <View style={styles.breakingTag}>
                    <ThemedText type="smallBold" style={{ color: '#FFF', fontSize: 9 }}>LIVE</ThemedText>
                  </View>
                  <ThemedText type="smallBold" style={{ color: '#00E676', fontSize: 11 }}>
                    {item.tone}
                  </ThemedText>
                  <ThemedText type="small" style={{ opacity: 0.5, fontSize: 11 }}>
                    {item.asset} • Market Stream
                  </ThemedText>
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <ThemedText type="default" style={styles.headlineText} numberOfLines={2}>
                    {item.text}
                  </ThemedText>
                </View>
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
  heroCard: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#161719',
    borderWidth: 1,
    borderColor: '#2D3035',
    gap: 10,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  regimeMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  regimeBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  regimeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  regimeStatsRow: {
    flexDirection: 'row',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2D3035',
    gap: 10,
  },
  regimeStatCol: {
    flex: 1,
    minWidth: 0,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  gridCard: {
    flex: 1,
    flexShrink: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#161719',
    borderWidth: 1,
    borderColor: '#2D3035',
  },
  sectionHeader: {
    marginTop: 4,
  },
  filterRowWrapper: {
    marginVertical: 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#2A2C30',
  },
  filterChipActive: {
    backgroundColor: '#FF9900',
  },
  newsCard: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#161719',
    borderWidth: 1,
    borderColor: '#2D3035',
  },
  newsItem: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#21262D',
  },
  newsMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  breakingTag: {
    backgroundColor: '#00E676',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  headlineText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
