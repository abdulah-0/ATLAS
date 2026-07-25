import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { dbOperations } from '../services/db';

interface BtcConversionRecord {
  id: number;
  btc_amount: number;
  usd_spent: number;
  btc_price_at_buy: number;
  source_trade_id: string | null;
  purchased_at: string;
}

export default function BtcStackScreen() {
  const [btcPrice] = useState(67420.00); // Live price fallback

  // Mock / Initial Conversion Ledger State
  const [conversions] = useState<BtcConversionRecord[]>([
    {
      id: 1,
      btc_amount: 0.00169120,
      usd_spent: 114.00,
      btc_price_at_buy: 67410.00,
      source_trade_id: 'tr_1092',
      purchased_at: '2 hours ago',
    },
    {
      id: 2,
      btc_amount: 0.00284500,
      usd_spent: 185.50,
      btc_price_at_buy: 65200.00,
      source_trade_id: 'tr_1084',
      purchased_at: '3 days ago',
    },
    {
      id: 3,
      btc_amount: 0.00492000,
      usd_spent: 310.00,
      btc_price_at_buy: 63008.00,
      source_trade_id: 'tr_1070',
      purchased_at: '1 week ago',
    }
  ]);

  // Milestone target list
  const milestones = [0.1, 0.5, 1.0, 5.0, 10.0, 20.0];

  // Aggregates
  const totalBtc = conversions.reduce((sum, c) => sum + c.btc_amount, 0);
  const totalUsdSpent = conversions.reduce((sum, c) => sum + c.usd_spent, 0);
  const currentUsdValue = totalBtc * btcPrice;
  const weightedCostBasis = totalBtc > 0 ? totalUsdSpent / totalBtc : 0;
  const totalStackProfitUsd = currentUsdValue - totalUsdSpent;
  const totalStackProfitPct = totalUsdSpent > 0 ? (totalStackProfitUsd / totalUsdSpent) * 100 : 0;

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

            <ThemedText type="subtitle" style={{ color: '#00E676', marginTop: -Spacing.one }}>
              ≈ ${currentUsdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </ThemedText>

            {/* Progress Bar */}
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${Math.max(2, progressPct)}%` }]} />
            </View>

            {/* Milestones Row */}
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

          {/* Metrics Grid */}
          <View style={styles.metricsRow}>
            <ThemedView type="backgroundElement" style={styles.metricCard}>
              <ThemedText type="small" style={{ opacity: 0.6 }}>COST BASIS (AVG)</ThemedText>
              <ThemedText type="subtitle" style={{ fontSize: 18 }}>
                ${weightedCostBasis.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </ThemedText>
              <ThemedText type="small" style={{ opacity: 0.5 }}>Total Spent: ${totalUsdSpent.toFixed(2)}</ThemedText>
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.metricCard}>
              <ThemedText type="small" style={{ opacity: 0.6 }}>STACK P&L</ThemedText>
              <ThemedText type="subtitle" style={{ fontSize: 18, color: totalStackProfitUsd >= 0 ? '#00E676' : '#FF1744' }}>
                {totalStackProfitUsd >= 0 ? '+' : ''}${totalStackProfitUsd.toFixed(2)}
              </ThemedText>
              <ThemedText type="smallBold" style={{ color: totalStackProfitPct >= 0 ? '#00E676' : '#FF1744' }}>
                {totalStackProfitPct >= 0 ? '+' : ''}{totalStackProfitPct.toFixed(2)}% ROI
              </ThemedText>
            </ThemedView>
          </View>

          {/* Conversion Rules Card */}
          <ThemedView type="backgroundElement" style={styles.ruleCard}>
            <ThemedText type="smallBold" style={{ color: '#FF9900' }}>COMPOUNDING ENGINE RULES</ThemedText>
            <ThemedText type="small" style={{ opacity: 0.8 }}>
              • 80/20 Split: 80% of net profit converts to BTC; 20% re-allocates to bot capital.
            </ThemedText>
            <ThemedText type="small" style={{ opacity: 0.8 }}>
              • Dip Execution: Converts on &gt;0.8% intraday dips. Holds USDC during CRASH regime.
            </ThemedText>
          </ThemedView>

          {/* Conversion History Ledger */}
          <View style={styles.sectionHeader}>
            <ThemedText type="smallBold" style={{ opacity: 0.7 }}>CONVERSION HISTORY LEDGER</ThemedText>
          </View>

          {conversions.map((item) => (
            <ThemedView key={item.id} type="backgroundElement" style={styles.ledgerCard}>
              <View style={styles.ledgerRow}>
                <View>
                  <ThemedText type="default" style={{ color: '#FF9900', fontWeight: 'bold' }}>
                    +{item.btc_amount.toFixed(6)} BTC
                  </ThemedText>
                  <ThemedText type="small" style={{ opacity: 0.6 }}>
                    From Trade {item.source_trade_id} • {item.purchased_at}
                  </ThemedText>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <ThemedText type="default" style={{ fontWeight: 'bold' }}>
                    ${item.usd_spent.toFixed(2)} USD
                  </ThemedText>
                  <ThemedText type="small" style={{ opacity: 0.6 }}>
                    @ ${item.btc_price_at_buy.toLocaleString()}/BTC
                  </ThemedText>
                </View>
              </View>
            </ThemedView>
          ))}

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
  heroSubTitle: {
    opacity: 0.6,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  btcVal: {
    fontSize: 32,
  },
  progressBarBg: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2E3135',
    overflow: 'hidden',
    marginTop: Spacing.one,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#FF9900',
  },
  milestonesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  milestoneChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Spacing.four,
    backgroundColor: '#2A2C30',
  },
  milestoneChipAchieved: {
    backgroundColor: '#FF9900',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  metricCard: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: '#161719',
    borderWidth: 1,
    borderColor: '#2D3035',
    gap: 4,
  },
  ruleCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: '#161719',
    borderWidth: 1,
    borderColor: '#2D3035',
    gap: Spacing.one,
  },
  sectionHeader: {
    marginTop: Spacing.one,
  },
  ledgerCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: '#161719',
    borderWidth: 1,
    borderColor: '#2D3035',
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
