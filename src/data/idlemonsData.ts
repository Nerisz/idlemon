/**
 * Catálogo (mock) das espécies de Idlemon.
 *
 * Fonte de verdade estática dos atributos base e — agora — do pipeline de
 * pixel art. Cada espécie aponta para seu Sprite Sheet local via `require`
 * (resolvido pelo Metro em um module id numérico) e descreve como fatiá-lo.
 *
 * A `useGameStore` instancia membros da Party a partir daqui (`createPartyMember`),
 * mantendo o estado de jogo leve e desacoplado dos assets.
 */

import { palette } from "../theme/colors";
import type { PartyMember } from "../store/useGameStore";

/**
 * Descreve como o `SpriteAnimator` fatia um Sprite Sheet horizontal em quadros.
 * Omita (`undefined`) para tratar a imagem inteira como um único quadro estático
 * — útil para placeholders de arte de uma frame só.
 */
export interface SpriteSheetConfig {
  /** Largura (px de origem) de cada quadro dentro do sheet. */
  frameWidth: number;
  /** Altura (px de origem) de cada quadro dentro do sheet. */
  frameHeight: number;
  /** Total de quadros enfileirados horizontalmente. */
  frameCount: number;
  /** Velocidade da animação em quadros por segundo. */
  fps: number;
}

/** Definição estática de uma espécie de Idlemon. */
export interface Idlemon {
  /** Identificador da espécie (estável; usado para resolver no catálogo). */
  species: string;
  /** Nome exibido na UI. */
  name: string;
  /** Dano base por tick em posição de ataque. */
  baseDamage: number;
  /** Vida máxima da espécie. */
  maxHealth: number;
  /**
   * Cor neon do placeholder/glow. Continua sendo a cor do fallback enquanto a
   * textura carrega (e a máscara de blur do sprite quando ela aparece).
   */
  color: string;
  /**
   * Sprite Sheet local. `require` resolve para o module id numérico do Metro,
   * que é exatamente o que o `useImage` do Skia consome.
   */
  spritePath: number;
  /**
   * Configuração de fatiamento/animação. `undefined` => a imagem inteira é um
   * único quadro (caso do placeholder atual de uma frame só).
   */
  sheet?: SpriteSheetConfig;
}

/**
 * Catálogo base de espécies do MVP.
 *
 * NOTA p/ Direção de Arte: solte os Sprite Sheets finais em `assets/sprites/`
 * e atualize `spritePath` + `sheet` (frameWidth/Height/Count/fps) abaixo.
 * O placeholder atual é uma única frame, por isso `sheet` está omitido.
 */
export const IDLEMONS: Record<string, Idlemon> = {
  volt_slime: {
    species: "volt_slime",
    name: "Volt Slime",
    baseDamage: 10,
    maxHealth: 100,
    color: palette.neonCyan,
    spritePath: require("../../assets/sprites/volt_slime_sheet.png"),
    // sheet: { frameWidth: 64, frameHeight: 64, frameCount: 4, fps: 8 },
  },
};

/** Resolve uma espécie pelo ID. Retorna `undefined` se inválido. */
export function getIdlemon(species: string): Idlemon | undefined {
  return IDLEMONS[species];
}

/**
 * Cria uma instância de `PartyMember` a partir de uma espécie do catálogo.
 * `instanceId` deve ser único e estável (usado como `key` na UI e no Skia).
 */
export function createPartyMember(
  species: Idlemon,
  instanceId: string,
): PartyMember {
  return {
    id: instanceId,
    baseDamage: species.baseDamage,
    currentHealth: species.maxHealth,
    maxHealth: species.maxHealth,
    color: species.color,
    spritePath: species.spritePath,
    sheet: species.sheet,
  };
}
