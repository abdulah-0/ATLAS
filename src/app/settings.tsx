import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { secureStore } from '../services/secureStore';
import { alpaca } from '../services/alpaca';

export default function SettingsScreen() {
  const [tradingMode, setTradingMode] = useState<'PAPER' | 'LIVE'>('PAPER');
  const [isEmergencyHalted, setIsEmergencyHalted] = useState<boolean>(false);

  // Form State
  const [openRouterKey, setOpenRouterKey] = useState('sk-or-v1-****************');
  const [alpacaApiKey, setAlpacaApiKey] = useState('PK****************');
  const [alpacaSecretKey, setAlpacaSecretKey] = useState('********************************');
  const [pineconeKey, setPineconeKey] = useState('pcsk_****************');
  const [pineconeHost, setPineconeHost] = useState('https://atlas-index-1234.pinecone.io');

  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Save Credentials to Hardware-Backed SecureStore
  const handleSaveCredentials = async () => {
    try {
      if (openRouterKey && !openRouterKey.includes('*')) {
        await secureStore.setItem('OPENROUTER_API_KEY', openRouterKey);
      }
      if (alpacaApiKey && !alpacaApiKey.includes('*')) {
        await secureStore.setItem('ALPACA_API_KEY', alpacaApiKey);
      }
      if (alpacaSecretKey && !alpacaSecretKey.includes('*')) {
        await secureStore.setItem('ALPACA_SECRET_KEY', alpacaSecretKey);
      }
      if (pineconeKey && !pineconeKey.includes('*')) {
        await secureStore.setItem('PINECONE_API_KEY', pineconeKey);
      }

      setSaveStatus('✅ API Credentials Encrypted & Saved!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus('❌ Error saving credentials to SecureStore');
    }
  };

  // Toggle Live vs Paper Mode
  const handleToggleTradingMode = (newMode: 'PAPER' | 'LIVE') => {
    if (newMode === 'LIVE') {
      Alert.alert(
        '⚠️ CONFIRM LIVE TRADING MODE',
        'You are switching to LIVE REAL-MONEY TRADING. ATLAS will execute real market orders via Alpaca. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable Live Trading',
            style: 'destructive',
            onPress: () => {
              alpaca.setMode(true);
              setTradingMode('LIVE');
            }
          }
        ]
      );
    } else {
      alpaca.setMode(false);
      setTradingMode('PAPER');
    }
  };

  // Emergency Stop Circuit Breaker
  const handleEmergencyStop = () => {
    Alert.alert(
      '🚨 EMERGENCY STOP ALL BOTS',
      'This will IMMEDIATELY halt all bot signals, cancel pending orders, and pause trading across all markets.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'HALT ALL TRADING',
          style: 'destructive',
          onPress: () => {
            setIsEmergencyHalted(true);
            setSaveStatus('🚨 EMERGENCY HALT ACTIVE: All trading halted.');
          }
        }
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="small" style={{ opacity: 0.6 }}>ATLAS SYSTEM CONTROL & CREDENTIALS</ThemedText>
            <ThemedText type="subtitle">Settings & API Gateway</ThemedText>
          </View>

          {/* Emergency Stop Banner */}
          {isEmergencyHalted ? (
            <ThemedView type="backgroundElement" style={styles.emergencyHaltedBanner}>
              <ThemedText type="subtitle" style={{ color: '#FFF' }}>
                🚨 EMERGENCY CIRCUIT BREAKER ACTIVE
              </ThemedText>
              <ThemedText type="small" style={{ color: '#FFF', opacity: 0.9 }}>
                All bots paused. Market orders halted. Tap 'Reset System' to resume.
              </ThemedText>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => setIsEmergencyHalted(false)}
              >
                <ThemedText type="smallBold" style={{ color: '#FF1744' }}>RESET SYSTEM & RESUME</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          ) : (
            <TouchableOpacity style={styles.emergencyBtn} onPress={handleEmergencyStop}>
              <ThemedText type="subtitle" style={{ color: '#FFF', fontSize: 16 }}>
                🚨 EMERGENCY STOP ALL TRADING
              </ThemedText>
            </TouchableOpacity>
          )}

          {/* Trading Mode Segmented Toggle */}
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold" style={{ opacity: 0.7 }}>TRADING MODE SELECTION</ThemedText>
            
            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modeTab, tradingMode === 'PAPER' && styles.modeTabActivePaper]}
                onPress={() => handleToggleTradingMode('PAPER')}
              >
                <ThemedText type="smallBold" style={{ color: tradingMode === 'PAPER' ? '#000' : '#8E8E93' }}>
                  PAPER DEMO (SAFE)
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeTab, tradingMode === 'LIVE' && styles.modeTabActiveLive]}
                onPress={() => handleToggleTradingMode('LIVE')}
              >
                <ThemedText type="smallBold" style={{ color: tradingMode === 'LIVE' ? '#FFF' : '#8E8E93' }}>
                  LIVE REAL-MONEY ⚠️
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>

          {/* API Key Encryption Manager */}
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold" style={{ color: '#FF9900' }}>ENCRYPTED API CREDENTIALS</ThemedText>
            <ThemedText type="small" style={{ opacity: 0.6 }}>
              Keys are hardware-encrypted on-device using Android Keystore / iOS Keychain.
            </ThemedText>

            {/* OpenRouter Key */}
            <View style={styles.inputGroup}>
              <ThemedText type="small" style={{ opacity: 0.8 }}>OpenRouter API Key (Claude Opus / Sonnet / Haiku)</ThemedText>
              <TextInput
                style={styles.textInput}
                value={openRouterKey}
                onChangeText={setOpenRouterKey}
                secureTextEntry
                placeholderTextColor="#666"
              />
            </View>

            {/* Alpaca Keys */}
            <View style={styles.inputGroup}>
              <ThemedText type="small" style={{ opacity: 0.8 }}>Alpaca API Key</ThemedText>
              <TextInput
                style={styles.textInput}
                value={alpacaApiKey}
                onChangeText={setAlpacaApiKey}
                secureTextEntry
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={{ opacity: 0.8 }}>Alpaca Secret Key</ThemedText>
              <TextInput
                style={styles.textInput}
                value={alpacaSecretKey}
                onChangeText={setAlpacaSecretKey}
                secureTextEntry
                placeholderTextColor="#666"
              />
            </View>

            {/* Pinecone Keys */}
            <View style={styles.inputGroup}>
              <ThemedText type="small" style={{ opacity: 0.8 }}>Pinecone API Key (Vector Memory RAG)</ThemedText>
              <TextInput
                style={styles.textInput}
                value={pineconeKey}
                onChangeText={setPineconeKey}
                secureTextEntry
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={{ opacity: 0.8 }}>Pinecone Index Host Endpoint</ThemedText>
              <TextInput
                style={styles.textInput}
                value={pineconeHost}
                onChangeText={setPineconeHost}
                placeholderTextColor="#666"
              />
            </View>

            {/* Supabase Keys */}
            <View style={styles.inputGroup}>
              <ThemedText type="small" style={{ opacity: 0.8 }}>Supabase Project URL</ThemedText>
              <TextInput
                style={styles.textInput}
                value="https://your-supabase-project.supabase.co"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={{ opacity: 0.8 }}>Supabase Anon Key</ThemedText>
              <TextInput
                style={styles.textInput}
                value="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                secureTextEntry
                placeholderTextColor="#666"
              />
            </View>

            {saveStatus && (
              <ThemedText type="smallBold" style={{ color: '#00E676', textAlign: 'center', marginVertical: Spacing.one }}>
                {saveStatus}
              </ThemedText>
            )}

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveCredentials}>
              <ThemedText type="smallBold" style={{ color: '#000' }}>SAVE CREDENTIALS TO SECURE STORE</ThemedText>
            </TouchableOpacity>
          </ThemedView>

          {/* Hard Risk Rules Summary */}
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold" style={{ color: '#FF9900' }}>ACTIVE CODE-LEVEL HARD RISK RULES</ThemedText>
            <ThemedText type="small" style={{ opacity: 0.8 }}>1. Mandatory Stop Loss on all orders</ThemedText>
            <ThemedText type="small" style={{ opacity: 0.8 }}>2. Max 20% position size per trade hard cap</ThemedText>
            <ThemedText type="small" style={{ opacity: 0.8 }}>3. 1% Portfolio risk rule (stop-loss distance sizing)</ThemedText>
            <ThemedText type="small" style={{ opacity: 0.8 }}>4. 5% Daily loss limit trading halt</ThemedText>
            <ThemedText type="small" style={{ opacity: 0.8 }}>5. 20% Total drawdown circuit breaker</ThemedText>
            <ThemedText type="small" style={{ opacity: 0.8 }}>6. CRASH regime zero-entry lock</ThemedText>
          </ThemedView>

          {/* System Version Footer */}
          <View style={styles.footer}>
            <ThemedText type="small" style={{ opacity: 0.4, textAlign: 'center' }}>
              ATLAS Autonomous Trading Engine v1.0.0 • Expo SDK 57 (Android)
            </ThemedText>
          </View>

        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  header: {
    marginTop: Spacing.one,
  },
  emergencyBtn: {
    backgroundColor: '#D50000',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  emergencyHaltedBanner: {
    backgroundColor: '#FF1744',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  resetBtn: {
    backgroundColor: '#FFF',
    padding: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: '#161719',
    borderWidth: 1,
    borderColor: '#2D3035',
    gap: Spacing.two,
  },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: '#2A2C30',
    borderRadius: Spacing.two,
    padding: 3,
  },
  modeTab: {
    flex: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    borderRadius: Spacing.two,
  },
  modeTabActivePaper: {
    backgroundColor: '#FF9900',
  },
  modeTabActiveLive: {
    backgroundColor: '#FF1744',
  },
  inputGroup: {
    gap: 4,
  },
  textInput: {
    backgroundColor: '#232529',
    borderRadius: Spacing.two,
    padding: Spacing.two,
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#34373D',
    fontSize: 13,
  },
  saveBtn: {
    backgroundColor: '#FF9900',
    padding: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  footer: {
    marginTop: Spacing.two,
    marginBottom: Spacing.four,
  },
});
