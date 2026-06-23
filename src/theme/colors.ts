/**
 * Design System — Dark Mode minimalista com acentos Neon.
 *
 * Paleta da marca (Roxo / Branco / Amarelo) combinada com o acento Ciano
 * usado nas entidades de combate. Centralizar aqui mantém o motor Skia e a UI
 * do painel sincronizados quando o estado global entrar em cena.
 */

export const palette = {
  // Superfícies (do mais escuro ao mais elevado)
  trueBlack: "#000000",
  background: "#0D0D0D",
  surface: "#141414",
  surfaceElevated: "#1C1C1C",
  border: "#262626",

  // Texto
  textPrimary: "#FFFFFF",
  textSecondary: "#9A9A9A",
  textMuted: "#5C5C5C",

  // Acentos Neon
  neonCyan: "#00F0FF",
  neonPurple: "#A855F7",
  neonGold: "#FFD60A",

  // Combate
  heroFill: "#00F0FF",
  enemyFill: "#FF3B5C",
  healthTrack: "#2A2A2A",
  damageText: "#FF3B5C",
} as const;

/** Sombras/brilhos neon reutilizáveis (iOS shadow + Android elevation). */
export const glow = {
  cyan: {
    shadowColor: palette.neonCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 8,
  },
  purple: {
    shadowColor: palette.neonPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
