import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'danger' | 'success' | 'gold';
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const BORDER_COLORS = {
  default: '#30363D',
  danger: '#F85149',
  success: '#3FB950',
  gold: '#D29922',
};

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  fullWidth = true,
  style,
}) => {
  const r = useResponsive();
  return (
    <View
      style={[
        {
          backgroundColor: '#161B22',
          borderWidth: 1,
          borderColor: BORDER_COLORS[variant],
          borderRadius: 12,
          padding: r.spacing.md,
          width: fullWidth ? '100%' : undefined,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};
