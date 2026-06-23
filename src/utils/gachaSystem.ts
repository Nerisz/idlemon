/**
 * Sistema de Gacha (drop ponderado por raridade).
 *
 * Isolado da store e da UI: recebe o catálogo de runas e sorteia um item
 * respeitando os pesos de raridade. Puro e testável (sem efeitos colaterais).
 */

import { RUNES, type Rune, type RuneRarity } from "../data/runesData";

/** Peso relativo de cada raridade no sorteio (soma = 100). */
export const RARITY_WEIGHTS: Record<RuneRarity, number> = {
  common: 70,
  rare: 20,
  epic: 9,
  legendary: 1,
};

/**
 * Sorteia uma raridade via roleta ponderada e, em seguida, uma runa uniforme
 * dentro dessa raridade. Faz fallback para raridades existentes caso o catálogo
 * não tenha itens da raridade sorteada (mantém o roll sempre válido).
 */
export function rollRune(pool: Rune[] = RUNES): Rune {
  if (pool.length === 0) {
    throw new Error("gachaSystem: pool de runas vazio.");
  }

  const rarity = rollRarity(pool);
  const candidates = pool.filter((rune) => rune.rarity === rarity);
  const finalPool = candidates.length > 0 ? candidates : pool;

  return finalPool[Math.floor(Math.random() * finalPool.length)];
}

/** Seleciona uma raridade considerando apenas as presentes no pool. */
function rollRarity(pool: Rune[]): RuneRarity {
  const available = (Object.keys(RARITY_WEIGHTS) as RuneRarity[]).filter(
    (rarity) => pool.some((rune) => rune.rarity === rarity),
  );

  const totalWeight = available.reduce(
    (sum, rarity) => sum + RARITY_WEIGHTS[rarity],
    0,
  );

  let ticket = Math.random() * totalWeight;
  for (const rarity of available) {
    ticket -= RARITY_WEIGHTS[rarity];
    if (ticket < 0) return rarity;
  }

  return available[available.length - 1];
}
