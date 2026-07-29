import React from 'react';
import { View, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { useSettingsStore } from '../../store/settingsStore';
import { Text } from '../typography/Text';
import { Card } from '../layout/Card';
import { Row } from '../layout/Row';
import { Stack } from '../layout/Stack';

export const RiskLimitsEditor: React.FC = () => {
  const { goal } = useSettingsStore(state => state.settings);
  const { updateGoalSettings } = useSettingsStore();

  return (
    <Card variant="default" style={styles.card}>
      <Stack gap={14}>
        <Row justify="space-between" align="center">
          <Text variant="h3" color="white">
            Code-Level Risk Limits
          </Text>
          <Text variant="label" color="green">
            IMMUTABLE SYSTEM RULES
          </Text>
        </Row>

        {/* 1. Risk Per Trade */}
        <Stack gap={4}>
          <Row justify="space-between">
            <Text variant="bodySmall" color="white" style={{ fontWeight: '600' }}>
              Max Risk Per Trade
            </Text>
            <Text variant="mono" color={goal.riskPerTradePct > 2 ? 'red' : 'gold'}>
              {goal.riskPerTradePct.toFixed(1)}%
            </Text>
          </Row>
          <Text variant="caption" color="secondary">
            % of total portfolio risked on any single trade (1% default)
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={0.5}
            maximumValue={5.0}
            step={0.5}
            value={goal.riskPerTradePct}
            onValueChange={val => updateGoalSettings({ riskPerTradePct: val })}
            minimumTrackTintColor={goal.riskPerTradePct > 2 ? '#F85149' : '#D29922'}
            maximumTrackTintColor="#30363D"
            thumbTintColor="#FF9900"
          />
          {goal.riskPerTradePct > 2 && (
            <Text variant="caption" color="red">
              ⚠️ Warning: Risking &gt;2% per trade significantly increases risk of ruin.
            </Text>
          )}
        </Stack>

        {/* 2. Max Position Size */}
        <Stack gap={4}>
          <Row justify="space-between">
            <Text variant="bodySmall" color="white" style={{ fontWeight: '600' }}>
              Max Position Size (Hard Cap)
            </Text>
            <Text variant="mono" color="gold">
              {goal.maxPositionPct}%
            </Text>
          </Row>
          <Text variant="caption" color="secondary">
            Max % of bot allocation per single position (20% hard cap)
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={5}
            maximumValue={20}
            step={1}
            value={goal.maxPositionPct}
            onValueChange={val => updateGoalSettings({ maxPositionPct: val })}
            minimumTrackTintColor="#D29922"
            maximumTrackTintColor="#30363D"
            thumbTintColor="#FF9900"
          />
        </Stack>

        {/* 3. Daily Loss Halt */}
        <Stack gap={4}>
          <Row justify="space-between">
            <Text variant="bodySmall" color="white" style={{ fontWeight: '600' }}>
              Daily Loss Limit Halt
            </Text>
            <Text variant="mono" color="red">
              -{goal.dailyLossLimitPct}%
            </Text>
          </Row>
          <Text variant="caption" color="secondary">
            All trading halts if daily portfolio loss reaches this limit (5% default)
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={15}
            step={0.5}
            value={goal.dailyLossLimitPct}
            onValueChange={val => updateGoalSettings({ dailyLossLimitPct: val })}
            minimumTrackTintColor="#F85149"
            maximumTrackTintColor="#30363D"
            thumbTintColor="#F85149"
          />
        </Stack>

        {/* 4. Total Drawdown Halt */}
        <Stack gap={4}>
          <Row justify="space-between">
            <Text variant="bodySmall" color="white" style={{ fontWeight: '600' }}>
              Total Drawdown Circuit Breaker
            </Text>
            <Text variant="mono" color={goal.totalDrawdownPct > 30 ? 'red' : 'gold'}>
              -{goal.totalDrawdownPct}%
            </Text>
          </Row>
          <Text variant="caption" color="secondary">
            Full system circuit breaker halt if portfolio drops this % from peak (20% default)
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={5}
            maximumValue={50}
            step={1}
            value={goal.totalDrawdownPct}
            onValueChange={val => updateGoalSettings({ totalDrawdownPct: val })}
            minimumTrackTintColor={goal.totalDrawdownPct > 30 ? '#F85149' : '#D29922'}
            maximumTrackTintColor="#30363D"
            thumbTintColor="#F85149"
          />
          {goal.totalDrawdownPct > 30 && (
            <Text variant="caption" color="red">
              ⚠️ Warning: Drawdown halts &gt;30% leave less capital for recovery.
            </Text>
          )}
        </Stack>
      </Stack>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 14,
  },
  slider: {
    width: '100%',
    height: 36,
  },
});
