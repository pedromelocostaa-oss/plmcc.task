export const colors = {
  // OLED backgrounds
  bg: '#000000',
  surface: '#1C1C1E',
  surfaceRaised: '#2C2C2E',
  surfaceGlass: 'rgba(28,28,30,0.72)',
  separator: 'rgba(84,84,88,0.65)',
  separatorOpaque: '#38383A',

  // Labels (iOS system)
  text: '#FFFFFF',
  textSecondary: 'rgba(235,235,245,0.6)',
  textMuted: 'rgba(235,235,245,0.3)',
  textQuaternary: 'rgba(235,235,245,0.18)',

  // Accent — orange (iOS 17 system orange)
  accent: '#FF6B00',
  accentBg: 'rgba(255,107,0,0.14)',
  accentBorder: 'rgba(255,107,0,0.30)',

  // System colors
  success: '#30D158',
  danger: '#FF453A',
  warning: '#FF9F0A',
  info: '#0A84FF',
  purple: '#BF5AF2',

  // Priority
  p1: '#FF453A',
  p1Bg: 'rgba(255,69,58,0.14)',
  p2: '#FF9F0A',
  p2Bg: 'rgba(255,159,10,0.14)',
  p3: '#0A84FF',
  p3Bg: 'rgba(10,132,255,0.14)',

  // Legacy aliases
  border: 'rgba(84,84,88,0.65)',
  borderLight: 'rgba(84,84,88,0.36)',
  surfaceHover: '#2C2C2E',
  surfaceAlt: '#000000',
} as const;

export const spring = {
  default: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  snappy: 'cubic-bezier(0.23, 1, 0.32, 1)',
  gentle: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

export const radius = {
  xs: '6px',
  sm: '10px',
  md: '14px',
  lg: '18px',
  xl: '22px',
  full: '9999px',
} as const;

export const projectColors = [
  '#FF6B00',
  '#FF9F0A',
  '#30D158',
  '#0A84FF',
  '#BF5AF2',
  '#FF375F',
  '#64D2FF',
  '#FF453A',
  '#34C759',
] as const;
