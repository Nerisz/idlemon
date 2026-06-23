import { useMemo } from "react";
import { create } from "zustand";
import { palette } from "../theme/colors";
import {
  HERO_DAMAGE,
  HERO_MAX_HEALTH,
  DAMAGE_UPGRADE_BASE_COST,
  DAMAGE_UPGRADE_AMOUNT,
  DAMAGE_UPGRADE_COST_GROWTH,
} from "../components/combat/constants";
import { MAX_RUNE_SLOTS, getRuneById } from "../data/runesData";

/**
 * Um membro da Party (Idlemon). É a unidade de combate da fila indiana:
 * o índice 0 é sempre o Líder (responsável pela colisão com o inimigo).
 */
export interface PartyMember {
  /** Identificador único e estável (usado como `key` na UI e no Skia). */
  id: string;
  /** Dano base que o membro contribui por tick quando em posição de ataque. */
  baseDamage: number;
  /** Vida atual simulada no combate. */
  currentHealth: number;
  /** Vida máxima do membro. */
  maxHealth: number;
  /** Cor neon do placeholder (glow + preenchimento) no motor Skia. */
  color: string;
}

/**
 * Estado global da economia e da Party (fonte de verdade no JS thread).
 *
 * O motor Skia roda na UI thread e mantém SharedValues espelhadas para a
 * simulação; este store guarda os números "oficiais" do jogador e é consumido
 * de forma reativa pela UI do painel. A ponte entre os dois lados é feita via
 * `runOnJS` (combate → store) e via prop/SharedValue (store → combate).
 */
interface GameState {
  /** Ouro acumulado pelo jogador. */
  gold: number;
  /** Estágio atual do core loop infinito (inicia em 1). */
  stage: number;
  /** Membros da Party. O índice 0 é o Líder. */
  party: PartyMember[];
  /** Custo atual do próximo upgrade de dano (aplicado ao Líder). */
  damageUpgradeCost: number;
  /** IDs das runas que o jogador possui (mochila). */
  inventoryRunes: string[];
  /**
   * Slots equipados (tamanho fixo `MAX_RUNE_SLOTS`). Cada posição guarda o ID
   * da runa ou `null` quando o slot está vazio.
   */
  equippedRunes: (string | null)[];

  addGold: (amount: number) => void;
  /** Debita ouro apenas se houver saldo. Retorna `true` em caso de sucesso. */
  spendGold: (amount: number) => boolean;
  /** Avança um estágio (chamado quando o inimigo morre). */
  nextStage: () => void;
  /**
   * Compra o upgrade de dano do Líder se houver ouro suficiente.
   * Retorna `true` quando a compra é concluída.
   */
  upgradeDamage: () => boolean;
  /** Recruta um novo membro para a Party (uso futuro: Loja). */
  addPartyMember: (member: PartyMember) => void;
  /**
   * Equipa uma runa do inventário em um slot. Remove a runa de qualquer outro
   * slot antes (evita duplicar o mesmo ID em dois slots).
   */
  equipRune: (runeId: string, slotIndex: number) => void;
  /** Esvazia o slot informado. */
  unequipRune: (slotIndex: number) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  gold: 0,
  stage: 1,
  party: [
    {
      id: "idlemon_1",
      baseDamage: HERO_DAMAGE,
      currentHealth: HERO_MAX_HEALTH,
      maxHealth: HERO_MAX_HEALTH,
      color: palette.neonCyan,
    },
  ],
  damageUpgradeCost: DAMAGE_UPGRADE_BASE_COST,
  inventoryRunes: ["rune_fang", "rune_midas"],
  equippedRunes: Array.from({ length: MAX_RUNE_SLOTS }, () => null),

  addGold: (amount) =>
    set((state) => ({ gold: state.gold + Math.max(0, Math.round(amount)) })),

  spendGold: (amount) => {
    const cost = Math.max(0, Math.round(amount));
    if (get().gold < cost) return false;
    set((state) => ({ gold: state.gold - cost }));
    return true;
  },

  nextStage: () => set((state) => ({ stage: state.stage + 1 })),

  upgradeDamage: () => {
    const { gold, damageUpgradeCost, party } = get();
    if (gold < damageUpgradeCost || party.length === 0) return false;
    set((state) => ({
      gold: state.gold - damageUpgradeCost,
      party: state.party.map((member, index) =>
        index === 0
          ? { ...member, baseDamage: member.baseDamage + DAMAGE_UPGRADE_AMOUNT }
          : member,
      ),
      damageUpgradeCost: Math.round(
        state.damageUpgradeCost * DAMAGE_UPGRADE_COST_GROWTH,
      ),
    }));
    return true;
  },

  addPartyMember: (member) =>
    set((state) => ({ party: [...state.party, member] })),

  equipRune: (runeId, slotIndex) => {
    if (slotIndex < 0 || slotIndex >= MAX_RUNE_SLOTS) return;
    if (!get().inventoryRunes.includes(runeId)) return;
    set((state) => {
      const next = state.equippedRunes.map((id) => (id === runeId ? null : id));
      next[slotIndex] = runeId;
      return { equippedRunes: next };
    });
  },

  unequipRune: (slotIndex) => {
    if (slotIndex < 0 || slotIndex >= MAX_RUNE_SLOTS) return;
    set((state) => {
      const next = state.equippedRunes.slice();
      next[slotIndex] = null;
      return { equippedRunes: next };
    });
  },
}));

/** Modificadores de combate agregados a partir das runas equipadas. */
export interface CombatStats {
  /** Soma do `baseDamage` de toda a Party (sem runas). */
  baseDamage: number;
  /** Dano final do time já com o multiplicador de runas aplicado. */
  finalDamage: number;
  /** Multiplicador de dano (1 = sem bônus). */
  damageMultiplier: number;
  /** Multiplicador de ouro por vitória (1 = sem bônus). */
  goldMultiplier: number;
  /** Multiplicador de velocidade de ataque (1 = sem bônus). */
  attackSpeedMultiplier: number;
}

/**
 * Hook derivado: combina o `baseDamage` da Party com as porcentagens das runas
 * equipadas. Memoizado por `party` + `equippedRunes` para evitar recomputar a
 * cada render e estabilizar a referência consumida pelo motor Skia.
 */
export function useCombatStats(): CombatStats {
  const party = useGameStore((state) => state.party);
  const equippedRunes = useGameStore((state) => state.equippedRunes);

  return useMemo(() => {
    const baseDamage = party.reduce((sum, member) => sum + member.baseDamage, 0);

    let damageMultiplier = 1;
    let goldMultiplier = 1;
    let attackSpeedMultiplier = 1;

    for (const runeId of equippedRunes) {
      if (!runeId) continue;
      const rune = getRuneById(runeId);
      if (!rune) continue;

      if (rune.type === "damage_mult") damageMultiplier += rune.value;
      else if (rune.type === "gold_bonus") goldMultiplier += rune.value;
      else if (rune.type === "attack_speed") attackSpeedMultiplier += rune.value;
    }

    return {
      baseDamage,
      finalDamage: Math.round(baseDamage * damageMultiplier),
      damageMultiplier,
      goldMultiplier,
      attackSpeedMultiplier,
    };
  }, [party, equippedRunes]);
}
