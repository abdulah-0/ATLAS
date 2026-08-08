import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity } from 'react-native';
import { useLogsStore } from '../store/logsStore';
import { LogCategory, LogLevel, LogEvent } from '../types/logs';
import { tradingLoop } from '../services/tradingLoop';
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
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [isScanningNow, setIsScanningNow] = useState<boolean>(false);

  useEffect(() => {
    loadLogs();
    markAllRead();
  }, []);

  // 3-second auto-refresh polling loop when autoRefresh is enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(() => {
      loadLogs();
    }, 3000);

    return () => clearInterval(timer);
  }, [autoRefresh]);

  const handleManualScan = async () => {
    setIsScanningNow(true);
    await tradingLoop.runScanCycle();
    await loadLogs();
    setIsScanningNow(false);
  };

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
        <Row justify="space-between" align="flex-start">
          <Stack gap={2} style={{ flex: 1 }}>
            <Text variant="label" color="muted">
              REAL-TIME SYSTEM AUDIT TRAIL
            </Text>
            <Text variant="h1" color="white">
              System Event Logs
            </Text>
          </Stack>

          <TouchableOpacity
            style={[styles.autoRefreshBtn, autoRefresh ? styles.autoRefreshActive : styles.autoRefreshInactive]}
            onPress={() => setAutoRefresh(!autoRefresh)}
          >
            <Row gap={4} align="center">
              <View style={[styles.pulseDot, { backgroundColor: autoRefresh ? '#00E676' : '#FF9100' }]} />
              <Text variant="caption" color={autoRefresh ? 'green' : 'secondary'} style={{ fontSize: 10, fontWeight: 'bold' }}>
                {autoRefresh ? 'LIVE (3s)' : 'PAUSED'}
              </Text>
            </Row>
          </TouchableOpacity>
        </Row>

        {/* Controls Bar */}
        <Row gap={8} justify="space-between">
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={handleManualScan}
            disabled={isScanningNow}
          >
            <Text variant="caption" color="white" style={{ fontWeight: 'bold' }}>
              {isScanningNow ? '⚡ SCANNING MARKET...' : '▶️ RUN SCAN CYCLE NOW'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.refreshBtn} onPress={() => loadLogs()}>
            <Text variant="caption" color="gold" style={{ fontWeight: 'bold' }}>
              🔄 REFRESH
            </Text>
          </TouchableOpacity>
        </Row>

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
            <Stack gap={8} align="center">
              <Text variant="bodySmall" color="secondary" style={{ textAlign: 'center' }}>
                No log events recorded matching the selected filter.
              </Text>
              <TouchableOpacity style={styles.scanBtn} onPress={handleManualScan}>
                <Text variant="caption" color="white" style={{ fontWeight: 'bold' }}>
                  ▶️ RUN FIRST SCAN CYCLE
                </Text>
              </TouchableOpacity>
            </Stack>
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
  autoRefreshBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  autoRefreshActive: {
    backgroundColor: '#102A18',
    borderColor: '#00E676',
  },
  autoRefreshInactive: {
    backgroundColor: '#21262D',
    borderColor: '#30363D',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  scanBtn: {
    flex: 1,
    backgroundColor: '#2A2010',
    borderColor: '#FF9900',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshBtn: {
    backgroundColor: '#21262D',
    borderColor: '#30363D',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
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
