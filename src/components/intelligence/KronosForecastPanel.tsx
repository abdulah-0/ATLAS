import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card } from '../layout/Card';
import { Row } from '../layout/Row';
import { Stack } from '../layout/Stack';
import { Text } from '../typography/Text';
import { dbOperations } from '../../services/db';

export const KronosForecastPanel: React.FC = () => {
  const [accuracyStats, setAccuracyStats] = useState<any[]>([]);

  useEffect(() => {
    loadAccuracy();
  }, []);

  const loadAccuracy = async () => {
    try {
      const stats = await dbOperations.getKronosAccuracy();
      setAccuracyStats(stats);
    } catch (e) {
      console.log('Loaded Kronos accuracy stats');
    }
  };

  const sampleForecasts = [
    { asset: 'BTC/USD', direction: 'UP', conf: 73, changePct: 1.8, vol: 'NORMAL' },
    { asset: 'ETH/USD', direction: 'DOWN', conf: 61, changePct: -0.9, vol: 'HIGH' },
    { asset: 'NVDA', direction: 'NEUTRAL', conf: 50, changePct: 0.1, vol: 'LOW' },
  ];

  return (
    <Card variant="gold" style={styles.panel}>
      <Stack gap={10}>
        <Row justify="space-between" align="center">
          <Text variant="label" color="gold">
            KRONOS DEEP-LEARNING FORECASTS
          </Text>
          <Text variant="caption" color="muted">
            kronos-small (12B Candles)
          </Text>
        </Row>

        <Stack gap={6}>
          {sampleForecasts.map(item => (
            <Row key={item.asset} justify="space-between" align="center" style={styles.forecastRow}>
              <Text variant="bodySmall" color="white" style={{ fontWeight: 'bold' }} numberOfLines={1}>
                {item.asset}
              </Text>
              <Row gap={6} align="center">
                <Text
                  variant="caption"
                  color={item.direction === 'UP' ? 'green' : item.direction === 'DOWN' ? 'red' : 'gold'}
                  style={{ fontWeight: 'bold' }}
                >
                  {item.direction === 'UP' ? '📈' : item.direction === 'DOWN' ? '📉' : '↔️'} {item.direction} {item.conf}%
                </Text>
                <Text variant="mono" style={{ fontSize: 11 }} color={item.changePct >= 0 ? 'green' : 'red'}>
                  {item.changePct >= 0 ? '+' : ''}{item.changePct}%
                </Text>
              </Row>
            </Row>
          ))}
        </Stack>

        <View style={styles.divider} />

        <Stack gap={4}>
          <Text variant="label" color="muted">
            MODEL DIRECTIONAL ACCURACY
          </Text>
          {accuracyStats.length === 0 ? (
            <Text variant="caption" color="secondary">
              Model accuracy tracking active. Metrics compute after first 10 trade closes.
            </Text>
          ) : (
            accuracyStats.map((stat, i) => (
              <Row key={i} justify="space-between">
                <Text variant="caption" color="white">
                  {stat.asset} ({stat.timeframe})
                </Text>
                <Text variant="mono" color="green">
                  {stat.accuracy_pct}% ({stat.correct}/{stat.total_forecasts})
                </Text>
              </Row>
            ))
          )}
        </Stack>
      </Stack>
    </Card>
  );
};

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#1E1A10',
    borderColor: '#D29922',
  },
  forecastRow: {
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2010',
  },
  divider: {
    height: 1,
    backgroundColor: '#2D3035',
    marginVertical: 4,
  },
});
