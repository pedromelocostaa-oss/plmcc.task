export const colors = {
  // ── Backgrounds (theme-reactive via CSS vars) ──────────────────────────────
  bg:             'var(--hq-bg)',
  surface:        'var(--hq-surface)',
  surfaceRaised:  'var(--hq-surface-raised)',
  surfaceGlass:   'var(--hq-surface-glass)',
  surfaceHover:   'var(--hq-surface-hover)',
  surfaceAlt:     'var(--hq-surface-alt)',

  // Card / panel specific surfaces
  cardBg:         'var(--hq-card-bg)',    // main card glass
  columnBg:       'var(--hq-column-bg)', // kanban column container
  panelBg:        'var(--hq-panel-bg)',  // side panels (calendar, etc.)
  modalBg:        'var(--hq-modal-bg)',  // modal dialogs
  inlayBg:        'var(--hq-inlay-bg)', // inner sections (e.g. expanded, filters)

  // Borders / separators
  separator:      'var(--hq-border)',
  separatorOpaque:'var(--hq-separator-opaque)',
  border:         'var(--hq-border)',
  borderLight:    'var(--hq-border-light)',
  cardBorder:     'var(--hq-card-border)', // card outer border

  // Text
  text:             'var(--hq-text)',
  textSecondary:    'var(--hq-text-secondary)',
  textMuted:        'var(--hq-text-muted)',
  textQuaternary:   'var(--hq-text-quaternary)',

  // Accent — orange
  accent:       'var(--hq-accent)',
  accentBg:     'var(--hq-accent-bg)',
  accentBorder: 'var(--hq-accent-border)',

  // System colours (don't change between themes)
  success: '#30D158',
  danger:  '#FF453A',
  warning: '#FF9F0A',
  info:    '#0A84FF',
  purple:  '#BF5AF2',

  // Priority
  p1:   '#FF453A',
  p1Bg: 'rgba(255,69,58,0.14)',
  p2:   '#FF9F0A',
  p2Bg: 'rgba(255,159,10,0.14)',
  p3:   '#0A84FF',
  p3Bg: 'rgba(10,132,255,0.14)',
} as const;

export const spring = {
  default: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  bounce:  'cubic-bezier(0.34, 1.56, 0.64, 1)',
  snappy:  'cubic-bezier(0.23, 1, 0.32, 1)',
  gentle:  'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

export const radius = {
  xs:   '6px',
  sm:   '10px',
  md:   '14px',
  lg:   '18px',
  xl:   '22px',
  full: '9999px',
} as const;

export const projectColors = [
  '#FF6B00', '#FF9F0A', '#30D158', '#0A84FF',
  '#BF5AF2', '#FF375F', '#64D2FF', '#FF453A', '#34C759',
] as const;
