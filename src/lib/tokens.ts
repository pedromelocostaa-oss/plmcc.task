export const colors = {
  // ── Backgrounds (theme-reactive via CSS vars) ──────────────────────────────
  bg:             'var(--hq-bg)',
  bgElevated:     'var(--hq-bg-elevated)',
  surface:        'var(--hq-surface)',
  surfaceRaised:  'var(--hq-surface)',
  surfaceGlass:   'var(--hq-panel)',
  surfaceHover:   'var(--hq-surface-hover)',
  surfaceAlt:     'var(--hq-panel-solid)',
  panel:          'var(--hq-panel)',
  panelSolid:     'var(--hq-panel-solid)',
  overlay:        'var(--hq-overlay)',

  // Card / panel specific surfaces
  cardBg:         'var(--hq-card-bg)',
  columnBg:       'var(--hq-column-bg)',
  panelBg:        'var(--hq-panel-bg)',
  modalBg:        'var(--hq-modal-bg)',
  inlayBg:        'var(--hq-inlay-bg)',

  // Borders / separators
  separator:      'var(--hq-border)',
  separatorOpaque:'var(--hq-separator-opaque)',
  border:         'var(--hq-border)',
  borderStrong:   'var(--hq-border-strong)',
  borderLight:    'var(--hq-border-light)',
  divider:        'var(--hq-divider)',
  cardBorder:     'var(--hq-card-border)',

  // Text
  text:             'var(--hq-text)',
  textSecondary:    'var(--hq-text-secondary)',
  textMuted:        'var(--hq-text-muted)',
  textQuaternary:   'var(--hq-text-quaternary)',
  textFaint:        'var(--hq-text-faint)',

  // Accent — systemBlue
  accent:       'var(--hq-accent)',
  accentSoft:   'var(--hq-accent-soft)',
  accentStrong: 'var(--hq-accent-strong)',
  accentBg:     'var(--hq-accent-bg)',
  accentBorder: 'var(--hq-accent-border)',

  // System colours
  success: 'var(--hq-success)',
  danger:  'var(--hq-danger)',
  warning: 'var(--hq-warning)',
  info:    'var(--hq-info)',
  purple:  '#BF5AF2',

  // Priority (theme-reactive)
  p1:   'var(--hq-p1)',
  p1Bg: 'var(--hq-p1-bg)',
  p2:   'var(--hq-p2)',
  p2Bg: 'var(--hq-p2-bg)',
  p3:   'var(--hq-p3)',
  p3Bg: 'var(--hq-p3-bg)',

  // Shadows
  shadowSoft:  'var(--hq-shadow-soft)',
  shadow:      'var(--hq-shadow)',
  shadowFloat: 'var(--hq-shadow-float)',
} as const;

export const spring = {
  default: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  bounce:  'cubic-bezier(0.34, 1.56, 0.64, 1)',
  snappy:  'cubic-bezier(0.23, 1, 0.32, 1)',
  gentle:  'cubic-bezier(0.4, 0, 0.2, 1)',
  apple:   'cubic-bezier(0.2, 0.85, 0.25, 1)',
} as const;

export const radius = {
  xs:   '5px',
  sm:   '7px',
  md:   '10px',
  lg:   '14px',
  xl:   '20px',
  full: '9999px',
} as const;

export const projectColors = [
  '#FF6B00', '#FF9F0A', '#30D158', '#0A84FF',
  '#BF5AF2', '#FF375F', '#64D2FF', '#FF453A', '#34C759',
] as const;

// NAV tints for squircle icons (iOS Settings style)
export const NAV_TINTS = {
  home:      '#FF9500',
  tasks:     '#34C759',
  dash:      '#AF52DE',
  notes:     '#FFCC00',
  purchases: '#FF6B35',
  bookmarks: '#FF3B30',
  search:    '#8E8E93',
} as const;

// shade helper — darken/lighten hex by percentage
export function shade(hex: string, pct: number): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + Math.round(((num >> 16) * pct) / 100)));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + Math.round((((num >> 8) & 0xff) * pct) / 100)));
  const b = Math.max(0, Math.min(255, (num & 0xff) + Math.round(((num & 0xff) * pct) / 100)));
  return `rgb(${r},${g},${b})`;
}
