import { create } from "zustand";
import { palette } from "../theme/colors";
import {
  HERO_DAMAGE,
  HERO_MAX_HEALTH,
  DAMAGE_UPGRADE_BASE_COST,
  DAMAGE_UPGRADE_AMOUNT,
  DAMAGE_UPGRADE_COST_GROWTH,
} from "../components/combat/constants";

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
}));
