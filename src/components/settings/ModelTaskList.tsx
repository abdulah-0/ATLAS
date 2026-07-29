import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { LLMTaskKey } from '../../types/settings';
import { useSettingsStore, AVAILABLE_MODELS } from '../../store/settingsStore';
import { Text } from '../typography/Text';
import { Card } from '../layout/Card';
import { Row } from '../layout/Row';
import { Stack } from '../layout/Stack';
import { truncateModelId } from '../../utils/responsive';

interface ModelTaskListProps {
  onSelectTask: (taskKey: LLMTaskKey) => void;
}

export const ModelTaskList: React.FC<ModelTaskListProps> = ({ onSelectTask }) => {
  const { settings, resetAllModels } = useSettingsStore();
  const tasks = Object.values(settings.models);

  return (
    <Stack gap={12}>
      <Row justify="space-between" align="center">
        <Text variant="h2" color="white">
          LLM Task Assignments
        </Text>

        <TouchableOpacity onPress={resetAllModels}>
          <Text variant="label" color="gold">
            RESET ALL
          </Text>
        </TouchableOpacity>
      </Row>

      <Stack gap={8}>
        {tasks.map(assignment => {
          const model = AVAILABLE_MODELS.find(m => m.id === assignment.modelId);
          const modelName = model ? model.label : truncateModelId(assignment.modelId, 20);

          return (
            <TouchableOpacity
              key={assignment.taskKey}
              activeOpacity={0.8}
              onPress={() => onSelectTask(assignment.taskKey)}
            >
              <Card variant={assignment.tier === 'premium' ? 'gold' : 'default'} style={styles.taskCard}>
                <Row justify="space-between" align="center">
                  <Stack gap={2} style={{ flex: 1, paddingRight: 8 }}>
                    <Row gap={6} align="center">
                      <Text variant="bodySmall" style={{ fontWeight: 'bold' }} color="white" numberOfLines={1}>
                        {assignment.label}
                      </Text>
                      <View
                        style={[
                          styles.tierBadge,
                          {
                            backgroundColor:
                              assignment.tier === 'premium'
                                ? '#3D2A10'
                                : assignment.tier === 'free'
                                ? '#102A18'
                                : '#21262D',
                          },
                        ]}
                      >
                        <Text
                          variant="caption"
                          style={{ fontSize: 9 }}
                          color={
                            assignment.tier === 'premium'
                              ? 'gold'
                              : assignment.tier === 'free'
                              ? 'green'
                              : 'secondary'
                          }
                        >
                          {assignment.tier.toUpperCase()}
                        </Text>
                      </View>
                    </Row>
                    <Text variant="caption" color="secondary" numberOfLines={1}>
                      {assignment.description}
                    </Text>
                  </Stack>

                  <Stack align="flex-end" gap={2}>
                    <Row gap={4} align="center">
                      <Text variant="bodySmall" color="gold" style={{ fontWeight: '600' }} numberOfLines={1}>
                        {modelName}
                      </Text>
                      <Text variant="bodySmall" color="muted">
                        ›
                      </Text>
                    </Row>
                    <Text variant="mono" style={{ fontSize: 11 }} color={assignment.estCostUsd === 0 ? 'green' : 'muted'}>
                      {assignment.estCostUsd === 0 ? 'free' : `~$${assignment.estCostUsd.toFixed(3)}/call`}
                    </Text>
                  </Stack>
                </Row>
              </Card>
            </TouchableOpacity>
          );
        })}
      </Stack>
    </Stack>
  );
};

const styles = StyleSheet.create({
  taskCard: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tierBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
});
