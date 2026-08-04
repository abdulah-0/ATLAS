import React, { useState, useEffect } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { LLMTaskKey } from '../../types/settings';
import { useSettingsStore } from '../../store/settingsStore';
import { fetchModelCatalog, CatalogModel } from '../../services/modelCatalog';
import { Text } from '../typography/Text';
import { Card } from '../layout/Card';
import { Row } from '../layout/Row';
import { Stack } from '../layout/Stack';

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

  const [catalog, setCatalog] = useState<CatalogModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [providerFilter, setProviderFilter] = useState<string>('ALL');

  useEffect(() => {
    if (visible) {
      loadCatalog();
    }
  }, [visible]);

  const loadCatalog = async () => {
    const data = await fetchModelCatalog();
    setCatalog(data);
  };

  if (!visible || !taskKey || !currentAssignment) return null;

  const activeId = selectedModelId || currentAssignment.modelId;
  const selectedModel = catalog.find(m => m.id === activeId);

  const providers = ['ALL', 'anthropic', 'openai', 'google', 'deepseek', 'x-ai', 'meta-llama', 'qwen'];

  const filteredCatalog = catalog.filter(m => {
    if (providerFilter !== 'ALL' && m.provider !== providerFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q);
    }
    return true;
  });

  const isStructuredRequired = taskKey === 'tradeDecision' || taskKey === 'genomeGeneration' || taskKey === 'weeklyReview';
  const lacksStructuredOutput = selectedModel && isStructuredRequired && !selectedModel.supports_structured_outputs;

  const handleConfirm = () => {
    if (activeId && taskKey) {
      onSelect(taskKey, activeId);
    }
    setSelectedModelId(null);
    setSearchQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />

          <Stack gap={4} style={{ marginBottom: 8 }}>
            <Text variant="h2" color="white" numberOfLines={1}>
              {currentAssignment.label}
            </Text>
            <Text variant="caption" color="secondary" numberOfLines={2}>
              {currentAssignment.description}
            </Text>
          </Stack>

          {/* Search Bar */}
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search live models (e.g. gpt-4o, claude, deepseek)..."
            placeholderTextColor="#666"
          />

          {/* Provider Filter Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
            <Row gap={6}>
              {providers.map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.providerChip, providerFilter === p && styles.providerChipActive]}
                  onPress={() => setProviderFilter(p)}
                >
                  <Text variant="caption" color={providerFilter === p ? 'white' : 'secondary'} style={{ fontSize: 10, fontWeight: 'bold' }}>
                    {p.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </Row>
          </ScrollView>

          {/* Model Catalog List */}
          <ScrollView style={styles.modelList} showsVerticalScrollIndicator={false}>
            {filteredCatalog.length === 0 ? (
              <Text variant="bodySmall" color="secondary" style={{ textAlign: 'center', padding: 20 }}>
                No catalog models match search criteria.
              </Text>
            ) : (
              filteredCatalog.map(m => {
                const isSelected = activeId === m.id;
                const costVal = parseFloat(m.pricing.prompt) * 1_000_000;

                return (
                  <TouchableOpacity key={m.id} onPress={() => setSelectedModelId(m.id)} style={{ marginBottom: 6 }}>
                    <Card
                      variant={isSelected ? 'gold' : 'default'}
                      style={{
                        backgroundColor: isSelected ? '#262010' : '#161B22',
                        paddingVertical: 8,
                        paddingHorizontal: 10,
                      }}
                    >
                      <Row justify="space-between" align="center">
                        <Stack gap={2} style={{ flex: 1, paddingRight: 8 }}>
                          <Row gap={6} align="center">
                            <Text variant="bodySmall" color={isSelected ? 'gold' : 'white'} numberOfLines={1} style={{ fontWeight: 'bold' }}>
                              {m.name}
                            </Text>
                            {m.supports_structured_outputs && (
                              <View style={styles.badgeJson}>
                                <Text variant="caption" style={{ color: '#00E676', fontSize: 8 }}>JSON</Text>
                              </View>
                            )}
                          </Row>
                          <Text variant="caption" color="muted" numberOfLines={1}>
                            {m.id} • {(m.context_length / 1000).toFixed(0)}k ctx
                          </Text>
                        </Stack>

                        <Stack align="flex-end" gap={2}>
                          <Text variant="mono" style={{ fontSize: 11 }} color={costVal === 0 ? 'green' : 'gold'}>
                            {costVal === 0 ? 'FREE' : `$${costVal.toFixed(2)}/M`}
                          </Text>
                          <Text variant="caption" color="muted" style={{ fontSize: 9 }}>
                            {m.tier}
                          </Text>
                        </Stack>
                      </Row>
                    </Card>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* Structured Output Warning */}
          {lacksStructuredOutput && (
            <Card variant="danger" style={{ marginVertical: 6, padding: 6 }}>
              <Text variant="caption" color="red">
                ⚠️ Caution: Selected model may lack native structured JSON output support. Structured parser fallbacks will be enforced.
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
                Select Model
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
    padding: 14,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#484F58',
    alignSelf: 'center',
    marginBottom: 8,
  },
  searchInput: {
    backgroundColor: '#21262D',
    borderRadius: 8,
    padding: 8,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#30363D',
    fontSize: 12,
  },
  providerChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#21262D',
  },
  providerChipActive: {
    backgroundColor: '#FF9900',
  },
  badgeJson: {
    backgroundColor: '#102A18',
    borderColor: '#00E676',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  modelList: {
    maxHeight: 340,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#21262D',
  },
  confirmBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#D29922',
  },
});
