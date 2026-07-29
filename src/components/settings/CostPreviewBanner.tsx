import React from 'react';
import { StyleSheet } from 'react-native';
import { useSettingsStore } from '../../store/settingsStore';
import { Text } from '../typography/Text';
import { Card } from '../layout/Card';
import { Row } from '../layout/Row';
import { Stack } from '../layout/Stack';

export const CostPreviewBanner: React.FC = () => {
  const estimatedCost = useSettingsStore(state => state.estimatedMonthlyCost());
  const defaultMonthlyEst = 8.50; // Reference default baseline cost
  const diff = estimatedCost - defaultMonthlyEst;

  return (
    <Card variant="gold" style={styles.banner}>
      <Stack gap={6}>
        <Row justify="space-between" align="center">
          <Text variant="label" color="gold">
            ESTIMATED MONTHLY LLM COST
          </Text>
          <Text variant="caption" color="muted">
            22 Trading Days / mo
          </Text>
        </Row>

        <Row justify="space-between" align="center">
          <Stack gap={2}>
            <Text variant="display" color="white" style={{ fontSize: 28 }}>
              ${estimatedCost.toFixed(2)}
              <Text variant="bodySmall" color="secondary">
                /mo
              </Text>
            </Text>
          </Stack>

          <Stack align="flex-end" gap={2}>
            <Text variant="caption" color="secondary">
              Baseline: ${defaultMonthlyEst.toFixed(2)}/mo
            </Text>
            <Text
              variant="mono"
              style={{ fontSize: 12, fontWeight: 'bold' }}
              color={diff <= 0 ? 'green' : 'red'}
            >
              {diff === 0
                ? 'Matches default config'
                : diff > 0
                ? `▲ +$${diff.toFixed(2)} vs default`
                : `▼ -$${Math.abs(diff).toFixed(2)} vs default`}
            </Text>
          </Stack>
        </Row>
      </Stack>
    </Card>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#1E1A10',
    borderColor: '#D29922',
  },
});
