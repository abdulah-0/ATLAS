import React from 'react';
import { View, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { useSettingsStore } from '../../store/settingsStore';
import { Text } from '../typography/Text';
import { Card } from '../layout/Card';
import { Row } from '../layout/Row';
import { Stack } from '../layout/Stack';

export const ConversionRatioSlider: React.FC = () => {
  const { conversion } = useSettingsStore(state => state.settings);
  const updateConversionRatio = useSettingsStore(state => state.updateConversionRatio);

  const btcRatio = conversion.conversionRatio;
  const reinvestRatio = conversion.reinvestRatio;

  // Live example calculation on $100 profit
  const sampleProfit = 100;
  const btcUsd = (sampleProfit * btcRatio) / 100;
  const reinvestUsd = (sampleProfit * reinvestRatio) / 100;

  return (
    <Card variant="gold" style={styles.card}>
      <Stack gap={10}>
        <Row justify="space-between" align="center">
          <Text variant="h3" color="white">
            Profit Conversion Split
          </Text>
          <Row gap={4} align="center">
            <Text variant="mono" color="gold" style={{ fontWeight: 'bold' }}>
              {btcRatio}%
            </Text>
            <Text variant="caption" color="muted">
              BTC /
            </Text>
            <Text variant="mono" color="green" style={{ fontWeight: 'bold' }}>
              {reinvestRatio}%
            </Text>
            <Text variant="caption" color="muted">
              Reinvest
            </Text>
          </Row>
        </Row>

        <Stack gap={4}>
          <Slider
            style={styles.slider}
            minimumValue={10}
            maximumValue={95}
            step={5}
            value={btcRatio}
            onValueChange={val => updateConversionRatio(val)}
            minimumTrackTintColor="#D29922"
            maximumTrackTintColor="#3FB950"
            thumbTintColor="#FF9900"
          />
          <Row justify="space-between">
            <Text variant="caption" color="gold">
              10% (Min BTC)
            </Text>
            <Text variant="caption" color="green">
              95% (Max BTC)
            </Text>
          </Row>
        </Stack>

        <View style={styles.exampleBox}>
          <Text variant="caption" color="secondary" style={{ marginBottom: 4 }}>
            LIVE EXAMPLE ON $100 PROFIT:
          </Text>
          <Row justify="space-between">
            <Text variant="bodySmall" color="gold">
              → ${btcUsd.toFixed(2)} buys Bitcoin
            </Text>
            <Text variant="bodySmall" color="green">
              → ${reinvestUsd.toFixed(2)} bot capital
            </Text>
          </Row>
        </View>
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
    height: 40,
  },
  exampleBox: {
    backgroundColor: '#10141A',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#21262D',
  },
});
