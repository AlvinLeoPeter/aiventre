/** Aiventre's look: dark, high-contrast, status colours readable at a glance across a shop floor. */

export const C = {
  bg: '#0B0A12',
  card: '#15131F',
  cardRaised: '#1C1929',
  border: '#272338',
  text: '#F4F2FA',
  textDim: '#A19DB3',
  textFaint: '#6E6A80',
  brand: '#8657FF',
  brandSoft: 'rgba(134, 87, 255, 0.16)',
  mint: '#17E8B0',

  running: '#2BD67B',
  soon: '#FFB020',
  idle: '#FF5A5F',
  maintenance: '#7D7893',
} as const;

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const R = { sm: 10, md: 16, lg: 22, pill: 999 } as const;

export const T = {
  hero: { fontSize: 30, fontWeight: '800' as const, letterSpacing: -0.6, color: C.text },
  title: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.3, color: C.text },
  body: { fontSize: 15, color: C.text },
  dim: { fontSize: 14, color: C.textDim },
  small: { fontSize: 12, color: C.textDim },
  label: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.2, textTransform: 'uppercase' as const, color: C.textFaint },
};
