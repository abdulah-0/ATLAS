import React from 'react';
import { SafeAreaView, ScrollView, View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  scroll = true,
  padded = true,
  testID,
  style,
}) => {
  const r = useResponsive();
  const px = padded ? r.horizontalPadding : 0;

  const content = (
    <View style={[{ paddingHorizontal: px, flex: scroll ? undefined : 1 }, style]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} testID={testID}>
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: r.spacing.xxl }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0D1117' },
  scroll: { flex: 1 },
});
