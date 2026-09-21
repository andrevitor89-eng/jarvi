/**
 * Text Component - Jarvi Mobile
 * 
 * Implementação mobile do componente Text do design system.
 */

import React from 'react';
import { Text as RNText, TextStyle, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import type { Theme } from '@jarvi/shared/src/design-tokens/platforms/native';

// ============================================================================
// TIPOS
// ============================================================================

export type TextVariant =
  | 'heading'
  | 'title'
  | 'subtitle'
  | 'body'
  | 'caption'
  | 'overline';
export type TextSize =
  | 'xs'
  | 'sm'
  | 'base'
  | 'lg'
  | 'xl'
  | '2xl'
  | '3xl'
  | '4xl'
  | '5xl'
  | '6xl';
export type TextWeight =
  | 'thin'
  | 'extralight'
  | 'light'
  | 'normal'
  | 'medium'
  | 'semibold'
  | 'bold'
  | 'extrabold'
  | 'black';
export type TextColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'accent'
  | 'disabled'
  | 'positive'
  | 'negative'
  | 'warning'
  | 'info';

export interface TextProps {
  children?: React.ReactNode;
  variant?: TextVariant;
  size?: TextSize;
  weight?: TextWeight;
  color?: TextColor;
  align?: 'left' | 'center' | 'right' | 'justify';
  transform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  decoration?: 'none' | 'underline' | 'line-through';
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  selectable?: boolean;
  className?: string;
  style?: TextStyle;
  testID?: string;
  onPress?: () => void;
}

const COLOR_TOKENS: Record<TextColor, keyof Theme> = {
  primary: 'contentContent-primary',
  secondary: 'contentContent-secondary',
  tertiary: 'contentContent-tertiary',
  accent: 'contentContent-accent',
  disabled: 'contentContent-disabled',
  positive: 'contentContent-positive',
  negative: 'contentContent-negative',
  warning: 'contentContent-warning',
  info: 'contentContent-info',
};

// ============================================================================
// COMPONENTE
// ============================================================================

export function Text({
  children,
  variant = 'body',
  size = 'base',
  weight = 'normal',
  color = 'primary',
  align = 'left',
  transform = 'none',
  decoration = 'none',
  numberOfLines,
  ellipsizeMode = 'tail',
  selectable = false,
  onPress,
  className = '',
  style,
  testID,
  ...props
}: TextProps) {
  const { theme } = useTheme();

  // Obter estilos do texto
  const textStyles: TextStyle = {
    fontSize: size === 'xs' ? 12 : size === 'sm' ? 14 : size === 'base' ? 16 : size === 'lg' ? 18 : size === 'xl' ? 20 : size === '2xl' ? 24 : size === '3xl' ? 30 : size === '4xl' ? 36 : size === '5xl' ? 48 : 60,
    fontWeight: weight === 'thin' ? '100' : weight === 'extralight' ? '200' : weight === 'light' ? '300' : weight === 'normal' ? '400' : weight === 'medium' ? '500' : weight === 'semibold' ? '600' : weight === 'bold' ? '700' : weight === 'extrabold' ? '800' : '900',
    textAlign: align,
    textTransform: transform,
    textDecorationLine: decoration,
    color: theme[COLOR_TOKENS[color]],
    ...style,
  };

  // Se onPress estiver definido, usar TouchableOpacity
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <RNText
          style={textStyles}
          numberOfLines={numberOfLines}
          ellipsizeMode={ellipsizeMode}
          selectable={selectable}
          testID={testID}
          {...props}
        >
          {children}
        </RNText>
      </TouchableOpacity>
    );
  }

  return (
    <RNText
      style={textStyles}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
      selectable={selectable}
      testID={testID}
      {...props}
    >
      {children}
    </RNText>
  );
}

// ============================================================================
// COMPONENTES ESPECÍFICOS
// ============================================================================

export function Heading({
  children,
  level = 1,
  ...props
}: Omit<TextProps, 'variant' | 'size'> & { level?: 1 | 2 | 3 | 4 | 5 | 6 }) {
  const sizeMap = {
    1: '6xl' as const,
    2: '5xl' as const,
    3: '4xl' as const,
    4: '3xl' as const,
    5: '2xl' as const,
    6: 'xl' as const,
  };
  
  return (
    <Text
      {...props}
      variant="heading"
      size={sizeMap[level]}
      weight="bold"
    >
      {children}
    </Text>
  );
}

export function Title({
  children,
  ...props
}: Omit<TextProps, 'variant' | 'size' | 'weight'>) {
  return (
    <Text
      {...props}
      variant="title"
      size="2xl"
      weight="semibold"
    >
      {children}
    </Text>
  );
}

export function Subtitle({
  children,
  ...props
}: Omit<TextProps, 'variant' | 'size' | 'weight'>) {
  return (
    <Text
      {...props}
      variant="subtitle"
      size="lg"
      weight="medium"
    >
      {children}
    </Text>
  );
}

export function Body({
  children,
  ...props
}: Omit<TextProps, 'variant'>) {
  return (
    <Text
      {...props}
      variant="body"
    >
      {children}
    </Text>
  );
}

export function Caption({
  children,
  ...props
}: Omit<TextProps, 'variant' | 'size'>) {
  return (
    <Text
      {...props}
      variant="caption"
      size="sm"
    >
      {children}
    </Text>
  );
}

export function Overline({
  children,
  ...props
}: Omit<TextProps, 'variant' | 'size' | 'weight' | 'transform'>) {
  return (
    <Text
      {...props}
      variant="overline"
      size="xs"
      weight="medium"
      transform="uppercase"
    >
      {children}
    </Text>
  );
}

