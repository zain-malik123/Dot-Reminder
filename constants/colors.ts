export const colors = {
  // Base colors
  black: '#000000',
  darkGrey: '#1C1C1E',
  white: '#FFFFFF',
  lightGrey: '#F2F2F7',
  muted: '#A1A1AA',
  
  // Accent colors
  primary: '#007AFF',
  secondary: '#5856D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  
  // Category colors
  blue: '#0A84FF',
  purple: '#5E5CE6',
  green: '#30D158',
  orange: '#FF9F0A',
  red: '#FF453A',
  teal: '#64D2FF',
  indigo: '#4C1D95',
  pink: '#FF2D55',
};

export const theme = {
  dark: {
    background: colors.black,
    card: colors.darkGrey,
    text: colors.white,
    textSecondary: colors.lightGrey,
    textMuted: colors.muted,
    border: '#2C2C2E',
    notification: colors.primary,
    tabBar: '#121212',
    tabBarInactive: '#8E8E93',
  },
  light: {
    background: colors.white,
    card: '#F8F9FA',
    text: colors.black,
    textSecondary: colors.darkGrey,
    textMuted: '#6B7280',
    border: '#E5E7EB',
    notification: colors.primary,
    tabBar: colors.white,
    tabBarInactive: '#9CA3AF',
  },
};

export default theme;