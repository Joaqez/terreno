/**
 * Tema visual de Terreno.
 * Estos valores están tomados del mockup interactivo que se validó con el equipo
 * (paleta "neutro y profesional" con acento verde-azulado / teal).
 * Si cambia la identidad de marca real de la empresa, este es el único archivo
 * que debería tocarse para repintar toda la app.
 */

export const colors = {
  bg: '#FAFAF8',
  bgElevated: '#FFFFFF',
  ink: '#17231F',
  inkSoft: '#5B6A64',
  inkFaint: '#93A29C',
  border: '#E6EBE8',

  accent: '#24625B',
  accentInk: '#FFFFFF',
  accentSoft: '#E1F0EC',

  amber: '#A8721F',
  amberSoft: '#F8EDDA',

  success: '#2E7D4F',
  successSoft: '#E3F4E9',

  danger: '#B54436',
  dangerSoft: '#FBEAE7',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  pill: 999,
} as const;

export const typography = {
  // Sora (display) + Inter (texto) + IBM Plex Mono (números) — igual que el mockup.
  // Cargar las fuentes reales con expo-font en App.tsx antes de usarlas por nombre;
  // mientras tanto se usa la fuente del sistema como fallback seguro.
  display: undefined as string | undefined,
  body: undefined as string | undefined,
  mono: undefined as string | undefined,

  size: {
    xs: 12,
    sm: 13,
    md: 14.5,
    lg: 17,
    xl: 21,
  },
} as const;
