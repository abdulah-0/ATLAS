import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity } from 'react-native';
import { useLogsStore } from '../store/logsStore';
import { LogCategory, LogLevel, LogEvent } from '../types/logs';
import { Screen } from '../components/layout/Screen';
import { Card } from '../components/layout/Card';
import { Row } from '../components/layout/Row';
import { Stack } from '../components/layout/Stack';
import { Text } from '../components/typography/Text';

const LEVEL_COLORS: Record<LogLevel, { text: 'green' | 'red' | 'gold' | 'blue' | 'secondary'; bg: string }> = {
  info: { text: 'blue', bg: '#102035' },
  success: { text: 'green', bg: '#102A18' },
  warning: { text: 'gold', bg: '#2A2010' },
  error: { text: 'red', bg: '#3D1014' },
  system: { text: 'secondary', bg: '#21262D' },
};

export default function LogsScreen() {
  const { logs, markAllRead, loadLogs } = useLogsStore();
  const [selectedCategory, setSelectedCategory] = useState<LogCategory | 'ALL'>('ALL');
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'ALL'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
    markAllRead();
  }, []);

  const categories: (LogCategory | 'ALL')[] = [
    'ALL',
    'decision',
    'kronos',
    'execution',
    'risk',
    'signal',
    'regime',
    'news',
    'bot_lifecycle',
    'btc',
    'system',
  ];

  const levels: (LogLevel | 'ALL')[] = ['ALL', 'info', 'success', 'warning', 'error', 'system'];

  const filteredLogs = logs.filter(item => {
    if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
    if (selectedLevel !== 'ALL' && item.level !== selectedLevel) return false;
    return true;
  });

  return (
    <Screen scroll padded>
      <Stack gap={12} style={{ paddingTop: 8 }}>
        {/* Header */}
        <Stack gap={2}>
          <Text variant="label" color="muted">
            REAL-TIME SYSTEM AUDIT TRAIL
          </Text>
          <Text variant="h1" color="white">
            System Event Logs
          </Text>
        </Stack>

        {/* Category Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Row gap={6}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text variant="caption" color={selectedCategory === cat ? 'white' : 'secondary'} style={{ fontWeight: '600' }}>
                  {cat.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </Row>
        </ScrollView>

        {/* Level Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Row gap={6}>
            {levels.map(lvl => (
              <TouchableOpacity
                key={lvl}
                style={[styles.filterChip, selectedLevel === lvl && styles.filterChipActive]}
                onPress={() => setSelectedLevel(lvl)}
              >
                <Text variant="caption" color={selectedLevel === lvl ? 'white' : 'muted'}>
                  {lvl.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </Row>
        </ScrollView>

        {/* Log Feed */}
        {filteredLogs.length === 0 ? (
          <Card variant="default" style={styles.emptyCard}>
            <Text variant="bodySmall" color="secondary" style={{ textAlign: 'center' }}>
              No log events recorded matching the selected filter.
            </Text>
          </Card>
        ) : (
          filteredLogs.map((item: LogEvent) => {
            const isError = item.level === 'error';
            const isExpanded = expandedId === item.id || isError;
            const levelStyle = LEVEL_COLORS[item.level] || LEVEL_COLORS.info;

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.85}
                onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}
              >
                <Card variant={isError ? 'danger' : 'default'} style={styles.logCard}>
                  <Stack gap={6}>
                    <Row justify="space-between" align="center">
                      <Row gap={6} align="center" style={{ flex: 1, paddingRight: 6 }}>
                        <View style={[styles.levelBadge, { backgroundColor: levelStyle.bg }]}>
                          <Text variant="caption" color={levelStyle.text} style={{ fontSize: 9, fontWeight: 'bold' }}>
                            {item.level.toUpperCase()}
                          </Text>
                        </View>
                        <Text variant="caption" color="muted">
                          [{item.category.toUpperCase()}]
                        </Text>
                      </Row>
                      <Text variant="caption" color="muted">
                        {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : ''}
                      </Text>
                    </Row>

                    <Text variant="bodySmall" color="white" style={{ fontWeight: '600' }} numberOfLines={isExpanded ? undefined : 2}>
                      {item.title}
                    </Text>

                    {item.detail && isExpanded && (
                      <View style={styles.detailBox}>
                        <Text variant="mono" style={{ fontSize: 11, lineHeight: 16 }} color="secondary">
                          {item.detail}
                        </Text>
                      </View>
                    )}
                  </Stack>
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </Stack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#21262D',
  },
  filterChipActive: {
    backgroundColor: '#FF9900',
  },
  emptyCard: {
    padding: 20,
    alignItems: 'center',
  },
  logCard: {
    padding: 10,
  },
  levelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  detailBox: {
    backgroundColor: '#10141A',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: '#21262D',
    marginTop: 4,
  },
});
