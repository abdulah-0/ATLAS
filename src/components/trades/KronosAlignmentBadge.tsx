import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../typography/Text';

export type KronosAlignment = 'CONFIRMS' | 'CONTRADICTS' | 'NEUTRAL' | 'UNAVAILABLE';

interface KronosAlignmentBadgeProps {
  alignment?: KronosAlignment | string | null;
}

const BADGE_CONFIG: Record<KronosAlignment, { label: string; color: string; bg: string }> = {
  CONFIRMS: { label: 'Kronos ✓', color: '#3FB950', bg: '#0A1A0A' },
  CONTRADICTS: { label: 'Kronos ✗', color: '#F85149', bg: '#1A0A0A' },
  NEUTRAL: { label: 'Kronos →', color: '#D29922', bg: '#1A1400' },
  UNAVAILABLE: { label: 'No Kronos', color: '#484F58', bg: '#161B22' },
};

export const KronosAlignmentBadge: React.FC<KronosAlignmentBadgeProps> = ({ alignment }) => {
  const key = (alignment?.toUpperCase() as KronosAlignment) || 'UNAVAILABLE';
  const cfg = BADGE_CONFIG[key] || BADGE_CONFIG.UNAVAILABLE;

  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
      <Text variant="caption" style={{ color: cfg.color, fontFamily: 'monospace', fontSize: 10 }}>
        {cfg.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});
