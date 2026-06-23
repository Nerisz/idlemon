/**
 * Dicionário (mock) do Sistema de Runas.
 *
 * Fonte de verdade estática dos modificadores de combate. O `useGameStore`
 * guarda apenas IDs (inventário/slots equipados) e resolve os atributos aqui,
 * mantendo o estado leve e serializável para futura persistência.
 */

import { palette } from "../theme/colors";

/** Natureza do bônus que a runa concede ao combate. */
export type RuneType = "damage_mult" | "gold_bonus" | "attack_speed";

/** Raridade — define a cor neon da borda do card e a força do bônus. */
export type RuneRarity = "common" | "rare" | "epic" | "legendary";

export interface Rune {
  /** Identificador único e estável (usado em inventário e slots). */
  id: string;
  /** Nome exibido na UI. */
  name: string;
  /** Tipo de modificador aplicado em `useCombatStats`. */
  type: RuneType;
  /** Fração do bônus (0.25 = +25%). Aditivo por tipo. */
  value: number;
  rarity: RuneRarity;
}

/** Cor neon de cada raridade (extraída do `theme.ts`). */
export const RARITY_COLORS: Record<RuneRarity, string> = {
  common: palette.textSecondary,
  rare: palette.neonCyan,
  epic: palette.neonPurple,
  legendary: palette.neonGold,
};

/** Rótulo curto e legível para cada tipo de runa. */
export const RUNE_TYPE_LABELS: Record<RuneType, string> = {
  damage_mult: "Dano",
  gold_bonus: "Ouro",
  attack_speed: "Velocidade",
};

/** Rótulo de raridade em PT-BR (usado em feedbacks da Loja). */
export const RARITY_LABELS: Record<RuneRarity, string> = {
  common: "Comum",
  rare: "Rara",
  epic: "Épica",
  legendary: "Lendária",
};

/** Quantidade máxima de runas equipadas simultaneamente. */
export const MAX_RUNE_SLOTS = 2;

/** Catálogo base de runas do MVP. */
export const RUNES: Rune[] = [
  {
    id: "rune_ember",
    name: "Brasa Menor",
    type: "damage_mult",
    value: 0.1,
    rarity: "common",
  },
  {
    id: "rune_fang",
    name: "Presa Voraz",
    type: "damage_mult",
    value: 0.25,
    rarity: "rare",
  },
  {
    id: "rune_midas",
    name: "Toque de Midas",
    type: "gold_bonus",
    value: 0.3,
    rarity: "epic",
  },
  {
    id: "rune_tempest",
    name: "Fúria da Tempestade",
    type: "attack_speed",
    value: 0.2,
    rarity: "rare",
  },
  {
    id: "rune_cataclysm",
    name: "Cataclismo",
    type: "damage_mult",
    value: 0.75,
    rarity: "legendary",
  },
];

const RUNES_BY_ID: Record<string, Rune> = RUNES.reduce(
  (map, rune) => {
    map[rune.id] = rune;
    return map;
  },
  {} as Record<string, Rune>,
);

/** Resolve uma runa pelo ID. Retorna `undefined` se o ID for inválido. */
export function getRuneById(id: string): Rune | undefined {
  return RUNES_BY_ID[id];
}

/** Formata o bônus como porcentagem (0.25 → "+25%"). */
export function formatRuneBonus(rune: Rune): string {
  return `+${Math.round(rune.value * 100)}%`;
}
