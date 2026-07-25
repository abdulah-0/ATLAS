import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { dbOperations } from '../services/db';

export default function BtcStackScreen() {
  const [btcPrice] = useState(67420.00);
  const [totalBtc, setTotalBtc] = useState<number>(0);
  const [conversions, setConversions] = useState<any[]>([]);

  const milestones = [0.1, 0.5, 1.0, 5.0, 10.0, 20.0];

  useEffect(() => {
    loadBtcStackFromDb();
  }, []);

  const loadBtcStackFromDb = async () => {
    try {
      const btcTotal = await dbOperations.getBtcStackTotal();
      setTotalBtc(btcTotal);
    } catch (e) {
      setTotalBtc(0);
    }
  };

  const currentUsdValue = totalBtc * btcPrice;
  const targetBtc = 20.0;
  const progressPct = Math.min(100, (totalBtc / targetBtc) * 100);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="small" style={{ opacity: 0.6 }}>ATLAS BTC COMPOUNDING ENGINE</ThemedText>
            <ThemedText type="subtitle">20 BTC North Star Progress</ThemedText>
          </View>

          {/* Hero Progress Card */}
          <ThemedView type="backgroundElement" style={styles.heroCard}>
            <View style={styles.heroRow}>
              <ThemedText type="smallBold" style={styles.heroSubTitle}>TOTAL ACCUMULATED BTC</ThemedText>
              <ThemedText type="smallBold" style={{ color: '#FF9900' }}>
                {progressPct.toFixed(4)}% COMPLETE
              </ThemedText>
            </View>

            <ThemedText type="title" style={styles.btcVal}>
              {totalBtc.toFixed(6)} <ThemedText type="subtitle" style={{ color: '#FF9900' }}>BTC</ThemedText>
            </ThemedText>

            <ThemedText type="subtitle" style={{ color: '#00E676', marginTop: -4 }}>
              ≈ ${currentUsdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </ThemedText>

            {/* Progress Bar */}
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${Math.max(2, progressPct)}%` }]} />
            </View>

            {/* Milestones Row - Responsive flexWrap */}
            <View style={styles.milestonesRow}>
              {milestones.map((m, idx) => {
                const isAchieved = totalBtc >= m;
                return (
                  <View key={idx} style={[styles.milestoneChip, isAchieved && styles.milestoneChipAchieved]}>
                    <ThemedText type="smallBold" style={{ fontSize: 10, color: isAchieved ? '#000' : '#8E8E93' }}>
                      {m} BTC {isAchieved ? '✓' : ''}
                    </ThemedText>
                  </View>
                );
              })}
            </View>
          </ThemedView>

          {/* Metrics Grid - Responsive flexWrap */}
          <View style={styles.metricsRow}>
            <ThemedView type="backgroundElement" style={styles.metricCard}>
              <ThemedText type="small" style={{ opacity: 0.6 }} numberOfLines={1}>TARGET GOAL</ThemedText>
              <ThemedText type="subtitle" style={{ fontSize: 16, marginTop: 2 }}>
                20.0000 <ThemedText type="small" style={{ color: '#FF9900' }}>BTC</ThemedText>
              </ThemedText>
              <ThemedText type="small" style={{ opacity: 0.5, marginTop: 2, fontSize: 11 }}>North Star Target</ThemedText>
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.metricCard}>
              <ThemedText type="small" style={{ opacity: 0.6 }} numberOfLines={1}>SPLIT RULE</ThemedText>
              <ThemedText type="subtitle" style={{ fontSize: 16, color: '#00E676', marginTop: 2 }}>
                80% / 20%
              </ThemedText>
              <ThemedText type="small" style={{ opacity: 0.5, marginTop: 2, fontSize: 11 }}>80% Profit -&gt; BTC Stack</ThemedText>
            </ThemedView>
          </View>

          {/* Conversion History Ledger */}
          <View style={styles.sectionHeader}>
            <ThemedText type="smallBold" style={{ opacity: 0.7 }}>CONVERSION HISTORY LEDGER</ThemedText>
          </View>

          {conversions.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.emptyCard}>
              <ThemedText type="smallBold" style={{ color: '#FF9900', textAlign: 'center' }}>
                🪙 80/20 Profit Queue Ready
              </ThemedText>
              <ThemedText type="small" style={{ opacity: 0.6, textAlign: 'center', marginTop: 4 }}>
                When paper trading bots close profitable trades, 80% of net profits automatically convert to BTC and log in this ledger.
              </ThemedText>
            </ThemedView>
          ) : (
            conversions.map((item) => (
              <ThemedView key={item.id} type="backgroundElement" style={styles.ledgerCard}>
                <View style={styles.ledgerRow}>
                  <View style={{ flexShrink: 1 }}>
                    <ThemedText type="default" style={{ color: '#FF9900', fontWeight: 'bold' }}>
                      +{item.btc_amount.toFixed(6)} BTC
                    </ThemedText>
                    <ThemedText type="small" style={{ opacity: 0.6 }}>
                      From Trade {item.source_trade_id}
                    </ThemedText>
                  </View>

                  <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                    <ThemedText type="default" style={{ fontWeight: 'bold' }}>
                      ${item.usd_spent.toFixed(2)} USD
                    </ThemedText>
                    <ThemedText type="small" style={{ opacity: 0.6 }}>
                      @ ${item.btc_price_at_buy.toLocaleString()}/BTC
                    </ThemedText>
                  </View>
                </View>
              </ThemedView>
            ))
          )}

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
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#161719',
    borderWidth: 1,
    borderColor: '#2D3035',
    gap: 6,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  heroSubTitle: {
    opacity: 0.6,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  btcVal: {
    fontSize: 26,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2E3135',
    overflow: 'hidden',
    marginTop: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#FF9900',
  },
  milestonesRow: {
    flexDirection: 'row',
    marginTop: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  milestoneChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#2A2C30',
  },
  milestoneChipAchieved: {
    backgroundColor: '#FF9900',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
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
  emptyCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#161719',
    borderWidth: 1,
    borderColor: '#2D3035',
    alignItems: 'center',
  },
  ledgerCard: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#161719',
    borderWidth: 1,
    borderColor: '#2D3035',
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
});
