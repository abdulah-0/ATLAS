import React, { useState } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LLMTaskKey } from '../../types/settings';
import { AVAILABLE_MODELS, AvailableModel, useSettingsStore } from '../../store/settingsStore';
import { Text } from '../typography/Text';
import { Card } from '../layout/Card';
import { Row } from '../layout/Row';
import { Stack } from '../layout/Stack';
import { truncateModelId } from '../../utils/responsive';

interface ModelPickerSheetProps {
  visible: boolean;
  taskKey: LLMTaskKey | null;
  onClose: () => void;
  onSelect: (taskKey: LLMTaskKey, modelId: string) => void;
}

export const ModelPickerSheet: React.FC<ModelPickerSheetProps> = ({
  visible,
  taskKey,
  onClose,
  onSelect,
}) => {
  const { settings } = useSettingsStore();
  const currentAssignment = taskKey ? settings.models[taskKey] : null;
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  if (!visible || !taskKey || !currentAssignment) return null;

  const activeId = selectedModelId || currentAssignment.modelId;
  const selectedModel = AVAILABLE_MODELS.find(m => m.id === activeId);

  const isDowngrade =
    currentAssignment.tier === 'premium' &&
    selectedModel &&
    selectedModel.tier !== 'premium';

  const handleConfirm = () => {
    if (activeId && taskKey) {
      onSelect(taskKey, activeId);
    }
    setSelectedModelId(null);
    onClose();
  };

  const renderTierGroup = (tier: 'premium' | 'mid' | 'cheap' | 'free', label: string) => {
    const tierModels = AVAILABLE_MODELS.filter(m => m.tier === tier);
    if (tierModels.length === 0) return null;

    return (
      <Stack gap={6} key={tier} style={{ marginBottom: 12 }}>
        <Text variant="label" color={tier === 'premium' ? 'gold' : tier === 'free' ? 'green' : 'secondary'}>
          {label}
        </Text>
        {tierModels.map(m => {
          const isSelected = activeId === m.id;
          return (
            <TouchableOpacity key={m.id} onPress={() => setSelectedModelId(m.id)}>
              <Card
                variant={isSelected ? 'gold' : 'default'}
                style={{
                  backgroundColor: isSelected ? '#262010' : '#161B22',
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                }}
              >
                <Row justify="space-between">
                  <Stack gap={2} style={{ flex: 1, paddingRight: 8 }}>
                    <Text variant="bodySmall" color={isSelected ? 'gold' : 'white'} numberOfLines={1}>
                      {m.label}
                    </Text>
                    <Text variant="caption" color="muted" numberOfLines={1}>
                      {truncateModelId(m.id, 28)}
                    </Text>
                  </Stack>
                  <Text variant="mono" color={m.cost === 0 ? 'green' : 'gold'}>
                    {m.cost === 0 ? 'FREE' : `$${m.cost.toFixed(3)}/call`}
                  </Text>
                </Row>
              </Card>
            </TouchableOpacity>
          );
        })}
      </Stack>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />

          <Stack gap={4} style={{ marginBottom: 12 }}>
            <Text variant="h2" color="white" numberOfLines={1}>
              {currentAssignment.label}
            </Text>
            <Text variant="bodySmall" color="secondary" numberOfLines={2}>
              {currentAssignment.description}
            </Text>
          </Stack>

          <ScrollView style={styles.modelList} showsVerticalScrollIndicator={false}>
            {renderTierGroup('premium', 'PREMIUM TIER (RECOMMENDED FOR REASONING)')}
            {renderTierGroup('mid', 'MID-TIER (BALANCED)')}
            {renderTierGroup('cheap', 'CHEAP TIER (FAST & LIGHT)')}
            {renderTierGroup('free', 'FREE TIER (OPEN ACCESS)')}
          </ScrollView>

          {isDowngrade && (
            <Card variant="danger" style={{ marginVertical: 8, padding: 8 }}>
              <Text variant="caption" color="red">
                ⚠️ Warning: {currentAssignment.warning || 'Downgrading from Premium may lower reasoning accuracy on this task.'}
              </Text>
            </Card>
          )}

          <Row gap={10} justify="flex-end" style={{ marginTop: 8 }}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text variant="bodySmall" color="secondary">
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text variant="bodySmall" color="white" style={{ fontWeight: 'bold' }}>
                Confirm Model
              </Text>
            </TouchableOpacity>
          </Row>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    maxHeight: '85%',
    backgroundColor: '#161719',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#484F58',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modelList: {
    maxHeight: 380,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#21262D',
  },
  confirmBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#D29922',
  },
});
