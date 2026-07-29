import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';

interface RowProps {
  children: React.ReactNode;
  gap?: number;
  wrap?: boolean;
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
  style?: StyleProp<ViewStyle>;
}

export const Row: React.FC<RowProps> = ({
  children,
  gap = 0,
  wrap = false,
  align = 'center',
  justify = 'flex-start',
  style,
}) => (
  <View
    style={[
      {
        flexDirection: 'row',
        flexWrap: wrap ? 'wrap' : 'nowrap',
        alignItems: align,
        justifyContent: justify,
        gap,
      },
      style,
    ]}
  >
    {children}
  </View>
);
