import React from 'react';
import { Text as RNText, StyleProp, TextStyle } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';

export type TextVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body'
  | 'bodySmall'
  | 'label'
  | 'mono'
  | 'caption';

export type TextColor =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'green'
  | 'red'
  | 'gold'
  | 'blue'
  | 'purple'
  | 'white';

interface TextProps {
  variant?: TextVariant;
  color?: TextColor;
  children: React.ReactNode;
  numberOfLines?: number;
  ellipsizeMode?: 'tail' | 'middle' | 'head' | 'clip';
  style?: StyleProp<TextStyle>;
}

const COLOR_MAP: Record<TextColor, string> = {
  primary: '#C9D1D9',
  secondary: '#8B949E',
  muted: '#484F58',
  green: '#3FB950',
  red: '#F85149',
  gold: '#D29922',
  blue: '#58A6FF',
  purple: '#BC8CFF',
  white: '#FFFFFF',
};

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color = 'primary',
  children,
  numberOfLines,
  ellipsizeMode = 'tail',
  style,
}) => {
  const r = useResponsive();

  const variantStyles: Record<TextVariant, TextStyle> = {
    display: { fontSize: r.fontSize.display, fontWeight: '700', letterSpacing: -1 },
    h1: { fontSize: r.fontSize.xxl, fontWeight: '700' },
    h2: { fontSize: r.fontSize.xl, fontWeight: '600' },
    h3: { fontSize: r.fontSize.lg, fontWeight: '600' },
    body: { fontSize: r.fontSize.md, fontWeight: '400', lineHeight: Math.round(r.fontSize.md * 1.5) },
    bodySmall: { fontSize: r.fontSize.sm, fontWeight: '400', lineHeight: Math.round(r.fontSize.sm * 1.5) },
    label: { fontSize: r.fontSize.xs, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
    mono: { fontSize: r.fontSize.md, fontFamily: 'monospace' },
    caption: { fontSize: r.fontSize.xs, fontWeight: '400' },
  };

  return (
    <RNText
      style={[variantStyles[variant], { color: COLOR_MAP[color] }, style]}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
      allowFontScaling={false}
    >
      {children}
    </RNText>
  );
};
