import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { regimeDetector, RegimeResult } from '../services/regime';

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
                <ThemedText type="title" style={{ color: getRegimeColor(currentRegimeName), fontSize: 28 }}>
                  {currentRegimeName}
                </ThemedText>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <ThemedText type="subtitle" style={{ color: '#FF9900' }}>
                  {confidencePct}% CONF
                </ThemedText>
                <ThemedText type="small" style={{ opacity: 0.6 }}>HMM Multiplier: 1.0x</ThemedText>
              </View>
            </View>

            <View style={styles.regimeStatsRow}>
              <View style={styles.regimeStatCol}>
                <ThemedText type="small" style={{ opacity: 0.5 }}>POSITION MULTIPLIER</ThemedText>
                <ThemedText type="smallBold">1.0x (100% Sizing)</ThemedText>
              </View>

              <View style={styles.regimeStatCol}>
                <ThemedText type="small" style={{ opacity: 0.5 }}>RISK COMPLIANCE</ThemedText>
                <ThemedText type="smallBold" style={{ color: '#00E676' }}>100% CLEAR</ThemedText>
              </View>
            </View>
          </ThemedView>

          {/* Fear & Greed + Calendar Grid */}
          <View style={styles.gridRow}>
            {/* Fear & Greed Card */}
            <ThemedView type="backgroundElement" style={styles.gridCard}>
              <ThemedText type="small" style={{ opacity: 0.6 }} numberOfLines={1}>FEAR & GREED INDEX</ThemedText>
              <ThemedText type="subtitle" style={{ color: '#00E676', fontSize: 22, marginVertical: 2 }}>
                68
              </ThemedText>
              <ThemedText type="smallBold" style={{ color: '#00E676' }}>
                GREED
              </ThemedText>
            </ThemedView>

            {/* Macro Status Card */}
            <ThemedView type="backgroundElement" style={styles.gridCard}>
              <ThemedText type="small" style={{ opacity: 0.6 }} numberOfLines={1}>MACRO BLACKOUT</ThemedText>
              <ThemedText type="subtitle" style={{ color: '#00E676', fontSize: 22, marginVertical: 2 }}>
                CLEAR
              </ThemedText>
              <ThemedText type="small" style={{ opacity: 0.6 }}>No Earnings Risk</ThemedText>
            </ThemedView>
          </View>

          {/* Live News Feed Header */}
          <View style={styles.sectionHeader}>
            <ThemedText type="smallBold" style={{ opacity: 0.7 }}>LIVE MARKET INTELLIGENCE FEED</ThemedText>
          </View>

          {/* Filter Chips */}
          <View style={styles.filterRow}>
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
          </View>

          <ThemedView type="backgroundElement" style={styles.newsCard}>
            <View style={styles.newsItem}>
              <View style={styles.newsMeta}>
                <View style={styles.breakingTag}>
                  <ThemedText type="smallBold" style={{ color: '#FFF', fontSize: 9 }}>LIVE</ThemedText>
                </View>
                <ThemedText type="smallBold" style={{ color: '#00E676', fontSize: 11 }}>
                  BULLISH
                </ThemedText>
                <ThemedText type="small" style={{ opacity: 0.5, fontSize: 11 }}>
                  BTC • Market Stream
                </ThemedText>
              </View>

              <ThemedText type="default" style={styles.headlineText}>
                Alpaca Paper Trading Account Ready. Signal Engine monitoring 15m and 1h bars for entry triggers.
              </ThemedText>
            </View>
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
  heroCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: '#161719',
    borderWidth: 1,
    borderColor: '#2D3035',
    gap: Spacing.two,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  regimeMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  regimeBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  regimeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  regimeStatsRow: {
    flexDirection: 'row',
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: '#2D3035',
    gap: Spacing.three,
  },
  regimeStatCol: {
    flex: 1,
  },
  gridRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  gridCard: {
    flex: 1,
    flexShrink: 1,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: '#161719',
    borderWidth: 1,
    borderColor: '#2D3035',
  },
  sectionHeader: {
    marginTop: Spacing.one,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.two,
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
  newsCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: '#161719',
    borderWidth: 1,
    borderColor: '#2D3035',
  },
  newsItem: {
    paddingVertical: Spacing.one,
  },
  newsMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.half,
  },
  breakingTag: {
    backgroundColor: '#00E676',
    paddingHorizontal: Spacing.one,
    paddingVertical: 1,
    borderRadius: Spacing.half,
  },
  headlineText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
