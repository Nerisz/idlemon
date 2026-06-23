import { create } from "zustand";
import {
  HERO_DAMAGE,
  DAMAGE_UPGRADE_BASE_COST,
  DAMAGE_UPGRADE_AMOUNT,
  DAMAGE_UPGRADE_COST_GROWTH,
} from "../components/combat/constants";

/**
 * Estado global da economia (fonte de verdade no JS thread).
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
  /** Dano base que o Hero aplica por tick — evoluível via upgrade. */
  heroDamage: number;
  /** Custo atual do próximo upgrade de dano. */
  damageUpgradeCost: number;

  addGold: (amount: number) => void;
  /** Debita ouro apenas se houver saldo. Retorna `true` em caso de sucesso. */
  spendGold: (amount: number) => boolean;
  /** Avança um estágio (chamado quando o inimigo morre). */
  nextStage: () => void;
  /**
   * Compra o upgrade de dano se houver ouro suficiente.
   * Retorna `true` quando a compra é concluída.
   */
  upgradeDamage: () => boolean;
}

export const useGameStore = create<GameState>((set, get) => ({
  gold: 0,
  stage: 1,
  heroDamage: HERO_DAMAGE,
  damageUpgradeCost: DAMAGE_UPGRADE_BASE_COST,

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
    const { gold, damageUpgradeCost } = get();
    if (gold < damageUpgradeCost) return false;
    set((state) => ({
      gold: state.gold - damageUpgradeCost,
      heroDamage: state.heroDamage + DAMAGE_UPGRADE_AMOUNT,
      damageUpgradeCost: Math.round(
        state.damageUpgradeCost * DAMAGE_UPGRADE_COST_GROWTH,
      ),
    }));
    return true;
  },
}));
