import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

interface NewsFeedCard {
  id: string;
  headline: string;
  source: string;
  asset: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  urgency: 'BREAKING' | 'NORMAL';
  time: string;
}

export default function IntelligenceScreen() {
  const [assetFilter, setAssetFilter] = useState<'ALL' | 'BTC' | 'ETH' | 'NVDA'>('ALL');

  // Regime State Mock / Live
  const [regime] = useState({
    name: 'BULL',
    confidence: 84,
    stability: 'HIGH',
    sizeMultiplier: 1.0,
    volatility: '1.45% / day',
    updatedAt: '12m ago',
  });

  // Fear & Greed Index State
  const [fearGreed] = useState({
    value: 68,
    label: 'GREED',
    color: '#00E676',
  });

  // Regime History (Past 30 Days Transitions)
  const [regimeHistory] = useState([
    { date: 'Jul 20 - Present', regime: 'BULL', duration: '5 days' },
    { date: 'Jul 14 - Jul 19', regime: 'NEUTRAL', duration: '6 days' },
    { date: 'Jul 08 - Jul 13', regime: 'BEAR', duration: '5 days' },
    { date: 'Jul 01 - Jul 07', regime: 'NEUTRAL', duration: '7 days' },
  ]);

  // Classified News Feed
  const [news] = useState<NewsFeedCard[]>([
    {
      id: 'n_1',
      headline: 'SEC Approves Options Trading for Bitcoin Spot ETFs Across Major Exchanges',
      source: 'Alpaca News',
      asset: 'BTC',
      sentiment: 'BULLISH',
      urgency: 'BREAKING',
      time: '12m ago',
    },
    {
      id: 'n_2',
      headline: 'Ethereum Staking Participation Reaches All-Time High of 34 Million ETH',
      source: 'CryptoPanic',
      asset: 'ETH',
      sentiment: 'BULLISH',
      urgency: 'NORMAL',
      time: '42m ago',
    },
    {
      id: 'n_3',
      headline: 'NVIDIA Announces Next-Gen AI Accelerator Architecture Details',
      source: 'Alpaca News',
      asset: 'NVDA',
      sentiment: 'BULLISH',
      urgency: 'NORMAL',
      time: '2h ago',
    },
    {
      id: 'n_4',
      headline: 'Federal Reserve Signals Steady Interest Rate Outlook for Next Quarter',
      source: 'Financial Times RSS',
      asset: 'BTC',
      sentiment: 'NEUTRAL',
      urgency: 'NORMAL',
      time: '4h ago',
    }
  ]);

  const filteredNews = news.filter(item => {
    if (assetFilter === 'ALL') return true;
    return item.asset === assetFilter;
  });

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
              <ThemedText type="small" style={{ opacity: 0.5 }}>Updated {regime.updatedAt}</ThemedText>
            </View>

            <View style={styles.regimeMainRow}>
              <View style={styles.regimeBadgeGroup}>
                <View style={[styles.regimeDot, { backgroundColor: getRegimeColor(regime.name) }]} />
                <ThemedText type="title" style={{ color: getRegimeColor(regime.name), fontSize: 32 }}>
                  {regime.name}
                </ThemedText>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <ThemedText type="subtitle" style={{ color: '#FF9900' }}>
                  {regime.confidence}% CONFIDENCE
                </ThemedText>
                <ThemedText type="small" style={{ opacity: 0.6 }}>
                  Stability: {regime.stability}
                </ThemedText>
              </View>
            </View>

            <View style={styles.regimeStatsRow}>
              <View style={styles.regimeStatCol}>
                <ThemedText type="small" style={{ opacity: 0.5 }}>POSITION MULTIPLIER</ThemedText>
                <ThemedText type="default" style={{ fontWeight: 'bold' }}>{regime.sizeMultiplier}x (100%)</ThemedText>
              </View>

              <View style={styles.regimeStatCol}>
                <ThemedText type="small" style={{ opacity: 0.5 }}>ANNUALIZED VOLATILITY</ThemedText>
                <ThemedText type="default" style={{ fontWeight: 'bold' }}>{regime.volatility}</ThemedText>
              </View>
            </View>
          </ThemedView>

          {/* Fear & Greed + Calendar Grid */}
          <View style={styles.gridRow}>
            {/* Fear & Greed Card */}
            <ThemedView type="backgroundElement" style={styles.gridCard}>
              <ThemedText type="small" style={{ opacity: 0.6 }}>FEAR & GREED INDEX</ThemedText>
              <ThemedText type="subtitle" style={{ color: fearGreed.color, fontSize: 24, marginVertical: 2 }}>
                {fearGreed.value}
              </ThemedText>
              <ThemedText type="smallBold" style={{ color: fearGreed.color }}>
                {fearGreed.label}
              </ThemedText>
            </ThemedView>

            {/* Macro Status Card */}
            <ThemedView type="backgroundElement" style={styles.gridCard}>
              <ThemedText type="small" style={{ opacity: 0.6 }}>MACRO EVENT BLACKOUT</ThemedText>
              <ThemedText type="subtitle" style={{ color: '#00E676', fontSize: 24, marginVertical: 2 }}>
                CLEAR
              </ThemedText>
              <ThemedText type="small" style={{ opacity: 0.6 }}>Next High Impact: 18h</ThemedText>
            </ThemedView>
          </View>

          {/* Regime History Timeline */}
          <View style={styles.sectionHeader}>
            <ThemedText type="smallBold" style={{ opacity: 0.7 }}>30-DAY REGIME TRANSITION HISTORY</ThemedText>
          </View>

          <ThemedView type="backgroundElement" style={styles.historyCard}>
            {regimeHistory.map((item, idx) => (
              <View key={idx} style={[styles.historyRow, idx < regimeHistory.length - 1 && styles.historyBorder]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                  <View style={[styles.historyDot, { backgroundColor: getRegimeColor(item.regime) }]} />
                  <View>
                    <ThemedText type="default" style={{ fontWeight: 'bold', color: getRegimeColor(item.regime) }}>
                      {item.regime} REGIME
                    </ThemedText>
                    <ThemedText type="small" style={{ opacity: 0.5 }}>{item.date}</ThemedText>
                  </View>
                </View>
                <ThemedText type="small" style={{ opacity: 0.6 }}>{item.duration}</ThemedText>
              </View>
            ))}
          </ThemedView>

          {/* Live News Feed */}
          <View style={styles.sectionHeader}>
            <ThemedText type="smallBold" style={{ opacity: 0.7 }}>LIVE CLASSIFIED NEWS FEED</ThemedText>
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

          {/* News List */}
          <ThemedView type="backgroundElement" style={styles.newsCard}>
            {filteredNews.map((item, idx) => (
              <View key={item.id} style={[styles.newsItem, idx < filteredNews.length - 1 && styles.newsBorder]}>
                <View style={styles.newsMeta}>
                  {item.urgency === 'BREAKING' && (
                    <View style={styles.breakingTag}>
                      <ThemedText type="smallBold" style={{ color: '#FFF', fontSize: 9 }}>BREAKING</ThemedText>
                    </View>
                  )}
                  <ThemedText type="smallBold" style={{
                    color: item.sentiment === 'BULLISH' ? '#00E676' : item.sentiment === 'BEARISH' ? '#FF1744' : '#B0B4BA',
                    fontSize: 11
                  }}>
                    {item.sentiment}
                  </ThemedText>
                  <ThemedText type="small" style={{ opacity: 0.5, fontSize: 11 }}>
                    {item.asset} • {item.source} • {item.time}
                  </ThemedText>
                </View>

                <ThemedText type="default" style={styles.headlineText}>
                  {item.headline}
                </ThemedText>
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
  scrollContent: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  header: {
    marginTop: Spacing.one,
  },
  heroCard: {
    padding: Spacing.four,
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
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  regimeStatsRow: {
    flexDirection: 'row',
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: '#2D3035',
    gap: Spacing.four,
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
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: '#161719',
    borderWidth: 1,
    borderColor: '#2D3035',
  },
  sectionHeader: {
    marginTop: Spacing.one,
  },
  historyCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: '#161719',
    borderWidth: 1,
    borderColor: '#2D3035',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  historyBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#2A2C30',
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
    paddingVertical: Spacing.two,
  },
  newsBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#2A2C30',
  },
  newsMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.half,
  },
  breakingTag: {
    backgroundColor: '#FF1744',
    paddingHorizontal: Spacing.one,
    paddingVertical: 1,
    borderRadius: Spacing.half,
  },
  headlineText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
