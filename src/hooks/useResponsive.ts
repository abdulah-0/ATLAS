import { useState, useEffect } from 'react';
import { Dimensions, ScaledSize } from 'react-native';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ResponsiveValues {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isXs: boolean; // < 360px — small phones
  isSm: boolean; // 360–479px — standard phones
  isMd: boolean; // 480–767px — large phones
  isLg: boolean; // 768–1023px — small tablets / foldables
  isXl: boolean; // 1024px+ — full tablets
  isTablet: boolean; // isLg || isXl
  isPhone: boolean; // isXs || isSm || isMd
  isLandscape: boolean;
  spacing: {
    xs: number; // ~4
    sm: number; // ~8
    md: number; // ~16
    lg: number; // ~24
    xl: number; // ~32
    xxl: number; // ~48
  };
  fontSize: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    display: number;
  };
  numColumns: number;
  cardWidth: number;
  horizontalPadding: number;
}

function getBreakpoint(width: number): Breakpoint {
  if (width < 360) return 'xs';
  if (width < 480) return 'sm';
  if (width < 768) return 'md';
  if (width < 1024) return 'lg';
  return 'xl';
}

function computeValues(screen: ScaledSize): ResponsiveValues {
  const { width, height } = screen;
  const bp = getBreakpoint(width);
  const isLandscape = width > height;

  const base = width < 360 ? 14 : width < 480 ? 16 : 18;

  const spacing = {
    xs: Math.round(base * 0.25),
    sm: Math.round(base * 0.5),
    md: Math.round(base),
    lg: Math.round(base * 1.5),
    xl: Math.round(base * 2),
    xxl: Math.round(base * 3),
  };

  const fontSize = {
    xs: width < 360 ? 10 : 11,
    sm: width < 360 ? 12 : 13,
    md: width < 360 ? 14 : 15,
    lg: width < 360 ? 16 : 17,
    xl: width < 360 ? 20 : 22,
    xxl: width < 360 ? 26 : 28,
    display: width < 360 ? 32 : width < 768 ? 38 : 48,
  };

  const hPad = bp === 'xs' ? 12 : bp === 'sm' ? 16 : bp === 'md' ? 20 : 24;
  const numCols = bp === 'lg' || bp === 'xl' ? 2 : 1;
  const cardWidth = Math.max(
    100,
    numCols === 2 ? (width - hPad * 2 - spacing.md) / 2 : width - hPad * 2
  );

  return {
    width,
    height,
    breakpoint: bp,
    isXs: bp === 'xs',
    isSm: bp === 'sm',
    isMd: bp === 'md',
    isLg: bp === 'lg',
    isXl: bp === 'xl',
    isTablet: bp === 'lg' || bp === 'xl',
    isPhone: bp === 'xs' || bp === 'sm' || bp === 'md',
    isLandscape,
    spacing,
    fontSize,
    numColumns: numCols,
    cardWidth,
    horizontalPadding: hPad,
  };
}

export function useResponsive(): ResponsiveValues {
  const [values, setValues] = useState(() =>
    computeValues(Dimensions.get('window'))
  );

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setValues(computeValues(window));
    });
    return () => sub?.remove();
  }, []);

  return values;
}
