import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';

interface StackProps {
  children: React.ReactNode;
  gap?: number;
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  style?: StyleProp<ViewStyle>;
}

export const Stack: React.FC<StackProps> = ({ children, gap = 0, align, style }) => (
  <View style={[{ flexDirection: 'column', gap, alignItems: align }, style]}>
    {children}
  </View>
);
