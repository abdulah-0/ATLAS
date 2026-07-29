import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { useSettingsStore } from '../../store/settingsStore';
import { Text } from '../typography/Text';
import { Card } from '../layout/Card';
import { Row } from '../layout/Row';
import { Stack } from '../layout/Stack';

export const BtcGoalEditor: React.FC = () => {
  const { goal } = useSettingsStore(state => state.settings);
  const { updateTargetBtc } = useSettingsStore();

  const [inputVal, setInputVal] = useState(String(goal.targetBtc));
  const btcPrice = 67420.0; // Market price benchmark

  const milestones = [0.1, 0.5, 1.0, 5.0, 10.0, 20.0];

  const handleBlur = () => {
    const parsed = parseFloat(inputVal);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 10000) {
      updateTargetBtc(parsed);
    } else {
      setInputVal(String(goal.targetBtc));
    }
  };

  const currentUsdVal = (goal.targetBtc * btcPrice);
  const formattedUsd = currentUsdVal >= 1000000
    ? `$${(currentUsdVal / 1000000).toFixed(2)}M`
    : `$${currentUsdVal.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

  return (
    <Card variant="default" style={styles.card}>
      <Stack gap={10}>
        <Row justify="space-between" align="center">
          <Text variant="h3" color="white">
            Target BTC Accumulation Goal
          </Text>
          <Text variant="caption" color="gold">
            ≈ {formattedUsd} USD
          </Text>
        </Row>

        <Row gap={10} align="center">
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={inputVal}
              onChangeText={setInputVal}
              onBlur={handleBlur}
              keyboardType="decimal-pad"
              placeholderTextColor="#666"
            />
          </View>
          <Text variant="h2" color="gold">
            BTC
          </Text>
          {goal.targetBtc !== 20 && (
            <TouchableOpacity style={styles.resetBtn} onPress={() => { updateTargetBtc(20); setInputVal('20'); }}>
              <Text variant="caption" color="secondary">
                Reset 20 BTC
              </Text>
            </TouchableOpacity>
          )}
        </Row>

        {/* Milestone markers */}
        <Stack gap={4} style={{ marginTop: 4 }}>
          <Text variant="label" color="muted">
            ACCUMULATION MILESTONE BADGES
          </Text>
          <Row justify="space-between" wrap style={styles.milestonesRow}>
            {milestones.map((m, idx) => {
              const isTargeted = goal.targetBtc >= m;
              return (
                <View key={idx} style={[styles.milestoneChip, isTargeted && styles.milestoneActive]}>
                  <Text variant="caption" color={isTargeted ? 'white' : 'muted'} style={{ fontSize: 10 }}>
                    {m} BTC
                  </Text>
                </View>
              );
            })}
          </Row>
        </Stack>
      </Stack>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 14,
  },
  inputWrapper: {
    flex: 1,
    maxWidth: 140,
    backgroundColor: '#21262D',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#30363D',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  input: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  resetBtn: {
    backgroundColor: '#21262D',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  milestonesRow: {
    gap: 6,
    marginTop: 4,
  },
  milestoneChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#161719',
    borderWidth: 1,
    borderColor: '#30363D',
  },
  milestoneActive: {
    borderColor: '#D29922',
    backgroundColor: '#2A2010',
  },
});
