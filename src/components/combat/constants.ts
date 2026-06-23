/**
 * Constantes de gameplay do motor de combate Skia.
 * Centralizadas para facilitar o tuning e, futuramente, a injeção via
 * gerenciador de estado global (stats vindos de Level Up, equipamentos, etc.).
 */

import { palette } from "../../theme/colors";

export const ARENA_HEIGHT_RATIO = 0.42;

// ---- Hero (Idlemon placeholder) -------------------------------------------
export const HERO_SIZE = 40;
export const HERO_START_X = 50;
export const HERO_SPEED = 1.8;
export const HERO_GLOW_COLOR = palette.heroFill;
export const HERO_GLOW_BLUR = 18;
export const HERO_MAX_HEALTH = 100;
/** Dano que o Hero causa por tick de colisão. */
export const HERO_DAMAGE = 10;

// ---- Enemy (Monstro placeholder) ------------------------------------------
export const ENEMY_RADIUS = 20;
export const ENEMY_START_X = 350;
export const ENEMY_SPEED = 1.2;
export const ENEMY_GLOW_COLOR = palette.enemyFill;
export const ENEMY_GLOW_BLUR = 18;
export const ENEMY_MAX_HEALTH = 80;
/** Dano que o Enemy causa por tick de colisão. */
export const ENEMY_DAMAGE = 7;

// ---- Combate ---------------------------------------------------------------
export const ENTITY_COLOR = palette.textPrimary;
/** Distância mínima entre centros para disparar a colisão "bump". */
export const COLLISION_THRESHOLD = HERO_SIZE / 2 + ENEMY_RADIUS;
/** Intervalo (ms) entre cada aplicação de dano enquanto colididos. */
export const DAMAGE_INTERVAL_MS = 1000;

// ---- Party (Fila Indiana) --------------------------------------------------
/** Espaço (px) entre as bordas de dois Idlemons na fila. */
export const PARTY_GAP = 10;
/** Distância centro-a-centro entre membros consecutivos da fila. */
export const PARTY_SPACING = HERO_SIZE + PARTY_GAP;
/** Folga (px) para considerar um membro "em posição de ataque" no slot. */
export const PARTY_IN_POSITION_EPSILON = 0.5;

// ---- Economia & Progressão (Core Loop infinito) ---------------------------
/** Ouro base por inimigo derrotado; multiplicado pelo estágio atual. */
export const BASE_GOLD_REWARD = 10;
/** Crescimento da vida máxima do inimigo a cada novo estágio (+15%). */
export const ENEMY_HEALTH_GROWTH = 1.15;
/** Custo inicial do upgrade de dano. */
export const DAMAGE_UPGRADE_BASE_COST = 20;
/** Quanto de dano cada upgrade adiciona ao Hero. */
export const DAMAGE_UPGRADE_AMOUNT = 5;
/** Crescimento do custo do upgrade a cada compra. */
export const DAMAGE_UPGRADE_COST_GROWTH = 1.5;

// ---- Health Bar ------------------------------------------------------------
export const HEALTH_BAR_WIDTH = 48;
export const HEALTH_BAR_HEIGHT = 6;
/** Folga vertical entre a barra e o topo da entidade. */
export const HEALTH_BAR_OFFSET = 16;

// ---- Floating Combat Text --------------------------------------------------
export const FCT_FONT_SIZE = 18;
export const FCT_RISE = 42; // distância (px) que o número sobe
export const FCT_DURATION_MS = 750;
