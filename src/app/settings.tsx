import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Screen } from '../components/layout/Screen';
import { Card } from '../components/layout/Card';
import { Row } from '../components/layout/Row';
import { Stack } from '../components/layout/Stack';
import { Text } from '../components/typography/Text';
import { CostPreviewBanner } from '../components/settings/CostPreviewBanner';
import { ModelTaskList } from '../components/settings/ModelTaskList';
import { ModelPickerSheet } from '../components/settings/ModelPickerSheet';
import { ConversionRatioSlider } from '../components/settings/ConversionRatioSlider';
import { BtcGoalEditor } from '../components/settings/BtcGoalEditor';
import { RiskLimitsEditor } from '../components/settings/RiskLimitsEditor';
import { LLMTaskKey } from '../types/settings';
import { useSettingsStore } from '../store/settingsStore';
import { secureStore, SECURE_KEYS } from '../services/secureStore';
import { alpaca } from '../services/alpaca';

export default function SettingsScreen() {
  const { updateModelForTask, resetAllSettings } = useSettingsStore();

  const [tradingMode, setTradingMode] = useState<'PAPER' | 'LIVE'>('PAPER');
  const [isEmergencyHalted, setIsEmergencyHalted] = useState<boolean>(false);
  const [activeTaskForPicker, setActiveTaskForPicker] = useState<LLMTaskKey | null>(null);

  // Key Inputs
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [alpacaApiKey, setAlpacaApiKey] = useState('');
  const [alpacaSecretKey, setAlpacaSecretKey] = useState('');
  const [pineconeKey, setPineconeKey] = useState('');
  const [pineconeHost, setPineconeHost] = useState('');
  const [kronosUrl, setKronosUrl] = useState('');
  const [kronosKey, setKronosKey] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');

  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    loadExistingKeys();
  }, []);

  const loadExistingKeys = async () => {
    try {
      const orKey = await secureStore.getItem(SECURE_KEYS.OPENROUTER_API_KEY);
      if (orKey) setOpenRouterKey(orKey);

      const alpKey = await secureStore.getItem(SECURE_KEYS.ALPACA_API_KEY);
      if (alpKey) setAlpacaApiKey(alpKey);

      const alpSec = await secureStore.getItem(SECURE_KEYS.ALPACA_SECRET_KEY);
      if (alpSec) setAlpacaSecretKey(alpSec);

      const pinKey = await secureStore.getItem(SECURE_KEYS.PINECONE_API_KEY);
      if (pinKey) setPineconeKey(pinKey);

      const pinHost = await secureStore.getItem(SECURE_KEYS.PINECONE_INDEX_HOST);
      if (pinHost) setPineconeHost(pinHost);

      const kroUrl = await secureStore.getItem(SECURE_KEYS.KRONOS_SERVICE_URL);
      if (kroUrl) setKronosUrl(kroUrl);

      const kroKey = await secureStore.getItem(SECURE_KEYS.KRONOS_API_KEY);
      if (kroKey) setKronosKey(kroKey);
    } catch (e) {
      console.log('Key load error:', e);
    }
  };

  const handleSaveCredentials = async () => {
    try {
      if (openRouterKey) await secureStore.setItem(SECURE_KEYS.OPENROUTER_API_KEY, openRouterKey);
      if (alpacaApiKey) await secureStore.setItem(SECURE_KEYS.ALPACA_API_KEY, alpacaApiKey);
      if (alpacaSecretKey) await secureStore.setItem(SECURE_KEYS.ALPACA_SECRET_KEY, alpacaSecretKey);
      if (pineconeKey) await secureStore.setItem(SECURE_KEYS.PINECONE_API_KEY, pineconeKey);
      if (pineconeHost) await secureStore.setItem(SECURE_KEYS.PINECONE_INDEX_HOST, pineconeHost);
      if (kronosUrl) await secureStore.setItem(SECURE_KEYS.KRONOS_SERVICE_URL, kronosUrl);
      if (kronosKey) await secureStore.setItem(SECURE_KEYS.KRONOS_API_KEY, kronosKey);

      setSaveStatus('✅ Credentials Encrypted & Saved!');
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err) {
      setSaveStatus('❌ Error saving credentials to SecureStore');
    }
  };

  const handleToggleTradingMode = (newMode: 'PAPER' | 'LIVE') => {
    if (newMode === 'LIVE') {
      Alert.alert(
        '⚠️ CONFIRM LIVE TRADING MODE',
        'You are switching to LIVE REAL-MONEY TRADING. ATLAS will execute real market orders via Alpaca. Are you sure?',
        [
          { text: 'Keep Paper Trading', style: 'cancel' },
          {
            text: 'Enable Live Real-Money Trading',
            style: 'destructive',
            onPress: () => {
              alpaca.setMode(true);
              setTradingMode('LIVE');
            },
          },
        ]
      );
    } else {
      alpaca.setMode(false);
      setTradingMode('PAPER');
    }
  };

  const handleEmergencyStop = () => {
    Alert.alert(
      '🚨 EMERGENCY STOP ALL BOTS',
      'This will IMMEDIATELY halt all bot signals, cancel pending paper/live orders, and pause trading across all markets.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'HALT ALL TRADING',
          style: 'destructive',
          onPress: () => {
            setIsEmergencyHalted(true);
            setSaveStatus('🚨 EMERGENCY HALT ACTIVE: All trading halted.');
          },
        },
      ]
    );
  };

  const handleResetAllFactory = () => {
    Alert.alert(
      'Factory Reset Settings',
      'Are you sure you want to reset all model assignments, conversion ratios, and risk parameters to factory defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset to Factory Defaults',
          style: 'destructive',
          onPress: () => {
            resetAllSettings();
            setSaveStatus('✅ All settings reset to factory defaults.');
            setTimeout(() => setSaveStatus(null), 3000);
          },
        },
      ]
    );
  };

  return (
    <Screen scroll padded>
      <Stack gap={16} style={{ paddingTop: 8 }}>
        {/* Header */}
        <Stack gap={2}>
          <Text variant="label" color="muted">
            ATLAS SYSTEM CONTROL & CONFIGURATION
          </Text>
          <Text variant="h1" color="white">
            System Settings
          </Text>
        </Stack>

        {/* Emergency Stop Banner */}
        {isEmergencyHalted ? (
          <Card variant="danger" style={styles.emergencyHaltedCard}>
            <Stack gap={6}>
              <Text variant="h3" color="white">
                🚨 EMERGENCY CIRCUIT BREAKER ACTIVE
              </Text>
              <Text variant="bodySmall" color="white">
                All bots paused. Market orders halted. Tap 'Reset System' to resume.
              </Text>
              <TouchableOpacity style={styles.resetBtn} onPress={() => setIsEmergencyHalted(false)}>
                <Text variant="bodySmall" color="red" style={{ fontWeight: 'bold' }}>
                  RESET SYSTEM & RESUME
                </Text>
              </TouchableOpacity>
            </Stack>
          </Card>
        ) : (
          <TouchableOpacity style={styles.emergencyBtn} onPress={handleEmergencyStop}>
            <Text variant="h3" color="white" style={{ textAlign: 'center' }}>
              🚨 EMERGENCY STOP ALL TRADING
            </Text>
          </TouchableOpacity>
        )}

        {/* Trading Mode Toggle */}
        <Card variant="default">
          <Stack gap={8}>
            <Text variant="label" color="muted">
              TRADING MODE SELECTION
            </Text>
            <Text variant="caption" color="secondary">
              Default mode is Paper Trading. Test bot strategies risk-free with virtual paper capital first before switching to real-money execution.
            </Text>

            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modeTab, tradingMode === 'PAPER' && styles.modeTabActivePaper]}
                onPress={() => handleToggleTradingMode('PAPER')}
              >
                <Text variant="label" color={tradingMode === 'PAPER' ? 'white' : 'muted'} style={{ fontSize: 10 }}>
                  PAPER DEMO (SAFE)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeTab, tradingMode === 'LIVE' && styles.modeTabActiveLive]}
                onPress={() => handleToggleTradingMode('LIVE')}
              >
                <Text variant="label" color={tradingMode === 'LIVE' ? 'white' : 'muted'} style={{ fontSize: 10 }}>
                  LIVE REAL-MONEY ⚠️
                </Text>
              </TouchableOpacity>
            </View>
          </Stack>
        </Card>

        {/* SECTION 1: LLM MODEL SELECTION */}
        <Stack gap={10}>
          <Text variant="label" color="gold">
            1. LLM MODEL ROUTING & SELECTION
          </Text>
          <CostPreviewBanner />
          <ModelTaskList onSelectTask={taskKey => setActiveTaskForPicker(taskKey)} />
        </Stack>

        {/* SECTION 2: BTC COMPOUNDING */}
        <Stack gap={10}>
          <Text variant="label" color="gold">
            2. BTC PROFIT COMPOUNDING
          </Text>
          <ConversionRatioSlider />
        </Stack>

        {/* SECTION 3: TRADING GOAL */}
        <Stack gap={10}>
          <Text variant="label" color="gold">
            3. NORTH STAR ACCUMULATION GOAL
          </Text>
          <BtcGoalEditor />
        </Stack>

        {/* SECTION 4: RISK CONTROLS */}
        <Stack gap={10}>
          <Text variant="label" color="gold">
            4. FINANCIAL SAFETY & RISK LIMITS
          </Text>
          <RiskLimitsEditor />
        </Stack>

        {/* SECTION 5: API KEYS MANAGER */}
        <Card variant="default">
          <Stack gap={10}>
            <Text variant="h3" color="white">
              Encrypted API Credentials
            </Text>
            <Text variant="caption" color="secondary">
              Credentials are encrypted on-device using hardware-backed SecureStore (Android Keystore).
            </Text>

            <Stack gap={4}>
              <Text variant="bodySmall" color="secondary">
                OpenRouter API Key (Claude / Gemini / Llama)
              </Text>
              <TextInput
                style={styles.textInput}
                value={openRouterKey}
                onChangeText={setOpenRouterKey}
                secureTextEntry
                placeholder="sk-or-v1-..."
                placeholderTextColor="#666"
              />
            </Stack>

            <Stack gap={4}>
              <Text variant="bodySmall" color="secondary">
                Alpaca API Key (Paper & Live)
              </Text>
              <TextInput
                style={styles.textInput}
                value={alpacaApiKey}
                onChangeText={setAlpacaApiKey}
                secureTextEntry
                placeholder="PK..."
                placeholderTextColor="#666"
              />
            </Stack>

            <Stack gap={4}>
              <Text variant="bodySmall" color="secondary">
                Alpaca Secret Key
              </Text>
              <TextInput
                style={styles.textInput}
                value={alpacaSecretKey}
                onChangeText={setAlpacaSecretKey}
                secureTextEntry
                placeholder="Secret key..."
                placeholderTextColor="#666"
              />
            </Stack>

            <Stack gap={4}>
              <Text variant="bodySmall" color="secondary">
                Pinecone API Key (Vector RAG Memory)
              </Text>
              <TextInput
                style={styles.textInput}
                value={pineconeKey}
                onChangeText={setPineconeKey}
                secureTextEntry
                placeholder="pcsk_..."
                placeholderTextColor="#666"
              />
            </Stack>

            <Stack gap={4}>
              <Text variant="bodySmall" color="secondary">
                Pinecone Index Host Endpoint
              </Text>
              <TextInput
                style={styles.textInput}
                value={pineconeHost}
                onChangeText={setPineconeHost}
                placeholder="https://atlas-index-1234.pinecone.io"
                placeholderTextColor="#666"
              />
            </Stack>

            <Stack gap={4}>
              <Text variant="bodySmall" color="gold">
                Kronos Service URL (Render Microservice)
              </Text>
              <TextInput
                style={styles.textInput}
                value={kronosUrl}
                onChangeText={setKronosUrl}
                placeholder="https://atlas-kronos-xxxx.onrender.com"
                placeholderTextColor="#666"
              />
            </Stack>

            <Stack gap={4}>
              <Text variant="bodySmall" color="gold">
                Kronos API Key (X-ATLAS-Key Header)
              </Text>
              <TextInput
                style={styles.textInput}
                value={kronosKey}
                onChangeText={setKronosKey}
                secureTextEntry
                placeholder="Kronos secret key..."
                placeholderTextColor="#666"
              />
            </Stack>

            <Stack gap={4}>
              <Text variant="bodySmall" color="secondary">
                Supabase Project URL
              </Text>
              <TextInput
                style={styles.textInput}
                value={supabaseUrl}
                onChangeText={setSupabaseUrl}
                placeholder="https://your-project.supabase.co"
                placeholderTextColor="#666"
              />
            </Stack>

            <Stack gap={4}>
              <Text variant="bodySmall" color="secondary">
                Supabase Anon Key
              </Text>
              <TextInput
                style={styles.textInput}
                value={supabaseAnonKey}
                onChangeText={setSupabaseAnonKey}
                secureTextEntry
                placeholder="eyJhbG..."
                placeholderTextColor="#666"
              />
            </Stack>

            {saveStatus && (
              <Text variant="bodySmall" color="green" style={{ textAlign: 'center' }}>
                {saveStatus}
              </Text>
            )}

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveCredentials}>
              <Text variant="bodySmall" color="white" style={{ fontWeight: 'bold', textAlign: 'center' }}>
                SAVE CREDENTIALS TO SECURE STORE
              </Text>
            </TouchableOpacity>
          </Stack>
        </Card>

        {/* SECTION 6: DANGER ZONE */}
        <Card variant="danger">
          <Stack gap={8}>
            <Text variant="h3" color="red">
              Danger Zone
            </Text>
            <Text variant="caption" color="secondary">
              Reset model choices, conversion ratios, and risk thresholds back to factory default values.
            </Text>

            <TouchableOpacity style={styles.factoryResetBtn} onPress={handleResetAllFactory}>
              <Text variant="bodySmall" color="red" style={{ fontWeight: 'bold', textAlign: 'center' }}>
                RESET ALL SETTINGS TO FACTORY DEFAULTS
              </Text>
            </TouchableOpacity>
          </Stack>
        </Card>

        {/* Footer */}
        <Text variant="caption" color="muted" style={{ textAlign: 'center', marginTop: 8, marginBottom: 24 }}>
          ATLAS Autonomous Trading Engine v1.1 • Expo SDK 57 (Android)
        </Text>
      </Stack>

      {/* Model Picker Bottom Sheet */}
      <ModelPickerSheet
        visible={Boolean(activeTaskForPicker)}
        taskKey={activeTaskForPicker}
        onClose={() => setActiveTaskForPicker(null)}
        onSelect={(taskKey, modelId) => updateModelForTask(taskKey, modelId)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  emergencyBtn: {
    backgroundColor: '#F85149',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  emergencyHaltedCard: {
    backgroundColor: '#3D1014',
  },
  resetBtn: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: '#21262D',
    borderRadius: 8,
    padding: 3,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  modeTabActivePaper: {
    backgroundColor: '#D29922',
  },
  modeTabActiveLive: {
    backgroundColor: '#F85149',
  },
  textInput: {
    backgroundColor: '#21262D',
    borderRadius: 8,
    padding: 10,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#30363D',
    fontSize: 13,
  },
  saveBtn: {
    backgroundColor: '#D29922',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  factoryResetBtn: {
    backgroundColor: '#21262D',
    borderWidth: 1,
    borderColor: '#F85149',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
});
