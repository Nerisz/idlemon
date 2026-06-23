import React, { useCallback, useEffect, useMemo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import {
  Canvas,
  Circle,
  BlurMask,
  Fill,
  matchFont,
} from "@shopify/react-native-skia";
import {
  useSharedValue,
  useFrameCallback,
  useDerivedValue,
  useAnimatedReaction,
  withTiming,
  withSequence,
  runOnJS,
  type SharedValue,
  type FrameInfo,
} from "react-native-reanimated";

import { palette } from "../../theme/colors";
import type { CombatStats, PartyMember } from "../../store/useGameStore";
import type { SpriteSheetConfig } from "../../data/idlemonsData";
import { HealthBar } from "./HealthBar";
import { FloatingDamage } from "./FloatingDamage";
import { ParallaxBackground } from "./ParallaxBackground";
import { Sprite } from "./Sprite";
import {
  ARENA_HEIGHT_RATIO,
  HERO_SIZE,
  HERO_SPEED,
  HERO_GLOW_BLUR,
  HERO_MAX_HEALTH,
  ENEMY_RADIUS,
  ENEMY_SPEED,
  ENEMY_GLOW_COLOR,
  ENEMY_GLOW_BLUR,
  ENEMY_MAX_HEALTH,
  ENEMY_DAMAGE,
  ENTITY_COLOR,
  COLLISION_THRESHOLD,
  DAMAGE_INTERVAL_MS,
  PARTY_SPACING,
  PARTY_IN_POSITION_EPSILON,
  BASE_GOLD_REWARD,
  ENEMY_HEALTH_GROWTH,
  HEALTH_BAR_WIDTH,
  HEALTH_BAR_HEIGHT,
  HEALTH_BAR_OFFSET,
  FCT_FONT_SIZE,
  FCT_RISE,
  FCT_DURATION_MS,
  PARALLAX_BG_SPEED,
  PARALLAX_FG_SPEED,
  BOB_AMPLITUDE,
  BOB_SPEED,
} from "./constants";

/** Fases do encontro. Pronto para expansão (status, fuga, recompensa). */
export type CombatState = "APPROACHING" | "BATTLING" | "VICTORY" | "DEFEAT";

/** Subconjunto dos modificadores de runas que o motor aplica em tempo real. */
export type CombatModifiers = Pick<
  CombatStats,
  "damageMultiplier" | "goldMultiplier" | "attackSpeedMultiplier"
>;

interface SkiaCombatEngineProps {
  /** Party do jogador (fonte de verdade no `useGameStore`). Índice 0 = Líder. */
  party: PartyMember[];
  /**
   * Modificadores agregados das runas equipadas (vindos de `useCombatStats`).
   * Espelhados em SharedValues e lidos no loop para buffar o combate ao vivo.
   */
  modifiers: CombatModifiers;
  /**
   * Disparado na UI thread (via `runOnJS`) quando o inimigo é derrotado.
   * Recebe a recompensa de ouro já calculada com o multiplicador de estágio.
   */
  onEnemyDefeated?: (goldReward: number) => void;
}

/**
 * Motor de combate Skia.
 *
 * Responsabilidade ÚNICA: simular e renderizar o encontro na UI thread via
 * Reanimated worklets. A economia e a Party vivem no `useGameStore` (JS thread):
 * os stats entram via props espelhadas em SharedValues e as vitórias saem via
 * `onEnemyDefeated` (runOnJS).
 *
 * Posições e danos da Party são mantidos em SharedValues do tipo array para que
 * o `useFrameCallback` itere sobre a fila inteiramente na UI thread, sem cruzar
 * a bridge. Cada membro é renderizado por um `<PartyMemberRect />` próprio (um
 * componente por slot) para respeitar as Rules of Hooks quando a Party cresce.
 */
export default function SkiaCombatEngine({
  party,
  modifiers,
  onEnemyDefeated,
}: SkiaCombatEngineProps) {
  const { width: screenWidth } = useWindowDimensions();
  const arenaHeight = Math.round(screenWidth * ARENA_HEIGHT_RATIO);
  const centerY = arenaHeight / 2;

  // Líder entra à esquerda; inimigo (re)aparece na extremidade direita da tela.
  const heroStartX = HERO_SIZE / 2;
  const enemyStartX = screenWidth + ENEMY_RADIUS;

  // Posição inicial em fila: membro i atrás do líder por i * PARTY_SPACING.
  const buildFormation = useCallback(
    (count: number) => {
      "worklet";
      const positions: number[] = [];
      for (let i = 0; i < count; i++) {
        positions.push(heroStartX - i * PARTY_SPACING);
      }
      return positions;
    },
    [heroStartX],
  );

  // Fonte do Floating Combat Text via fonte do sistema (sem bundle de assets).
  const fctFont = useMemo(
    () => matchFont({ fontSize: FCT_FONT_SIZE, fontWeight: "700" }),
    [],
  );

  // ---- Estado simulado (SharedValues → UI thread, sem bridge) -------------
  const combatState = useSharedValue<CombatState>("APPROACHING");

  // Arrays espelhados da Party: posição X e dano base por membro.
  const partyX = useSharedValue<number[]>(buildFormation(party.length));
  const partyDamage = useSharedValue<number[]>(party.map((m) => m.baseDamage));

  const enemyX = useSharedValue(enemyStartX);

  // O Líder (índice 0) é quem colide e recebe dano do inimigo.
  const leaderHealth = useSharedValue(party[0]?.maxHealth ?? HERO_MAX_HEALTH);
  const leaderMaxHealth = useSharedValue(
    party[0]?.maxHealth ?? HERO_MAX_HEALTH,
  );

  const enemyHealth = useSharedValue(ENEMY_MAX_HEALTH);
  /** Vida máxima atual do inimigo — cresce a cada estágio. */
  const enemyMaxHealth = useSharedValue(ENEMY_MAX_HEALTH);

  // Estágio espelhado na UI thread: dirige o multiplicador de ouro e o scaling.
  const stage = useSharedValue(1);

  // Acumulador de tempo para o dano periódico.
  const damageTimer = useSharedValue(0);

  // ---- Parallax & Bobbing (UI thread) -------------------------------------
  // Deslocamento horizontal das camadas (esteira infinita). Avançam apenas
  // enquanto o herói caminha (APPROACHING).
  const bgOffset = useSharedValue(0);
  const fgOffset = useSharedValue(0);
  // Fase angular do bobbing de caminhada do Líder.
  const bobPhase = useSharedValue(0);

  // Modificadores das runas espelhados na UI thread (lidos ao vivo no loop).
  const damageMultiplier = useSharedValue(modifiers.damageMultiplier);
  const goldMultiplier = useSharedValue(modifiers.goldMultiplier);
  const attackSpeedMultiplier = useSharedValue(modifiers.attackSpeedMultiplier);

  // Disparadores de Floating Combat Text (contador + último valor por entidade).
  const heroHitId = useSharedValue(0);
  const enemyHitId = useSharedValue(0);
  const heroHitAmount = useSharedValue(0);
  const enemyHitAmount = useSharedValue(0);

  // Estado de animação do FCT.
  const heroFctY = useSharedValue(0);
  const enemyFctY = useSharedValue(0);
  const heroFctOpacity = useSharedValue(0);
  const enemyFctOpacity = useSharedValue(0);

  // Espelha o dano da Party (store → UI thread) sem recriar o loop.
  useEffect(() => {
    partyDamage.value = party.map((m) => m.baseDamage);
  }, [party, partyDamage]);

  // Espelha os modificadores das runas (store → UI thread). Como o loop lê
  // `.value` ao vivo, equipar/desequipar buffa o combate sem reiniciar o frame.
  useEffect(() => {
    damageMultiplier.value = modifiers.damageMultiplier;
    goldMultiplier.value = modifiers.goldMultiplier;
    attackSpeedMultiplier.value = modifiers.attackSpeedMultiplier;
  }, [
    modifiers,
    damageMultiplier,
    goldMultiplier,
    attackSpeedMultiplier,
  ]);

  // Reposiciona a fila quando a quantidade de membros muda (ex.: recrutamento).
  useEffect(() => {
    partyX.value = buildFormation(party.length);
  }, [party.length, buildFormation, partyX]);

  // Espelha a vida máxima do Líder (store → UI thread).
  useEffect(() => {
    leaderMaxHealth.value = party[0]?.maxHealth ?? HERO_MAX_HEALTH;
  }, [party, leaderMaxHealth]);

  // ---- Game loop ----------------------------------------------------------
  const frameCallback = useCallback(
    (frame: FrameInfo) => {
      "worklet";
      const dt = frame.timeSincePreviousFrame ?? 16;
      const positions = partyX.value;
      const count = positions.length;
      if (count === 0) return;

      // Parallax + bobbing só avançam com o herói caminhando (esteira viva).
      // Reset contínuo (subtrai a largura, sem zerar) p/ loop sem emenda.
      if (combatState.value === "APPROACHING") {
        const step = dt / 16;
        bgOffset.value += PARALLAX_BG_SPEED * step;
        if (bgOffset.value >= screenWidth) bgOffset.value -= screenWidth;
        fgOffset.value += PARALLAX_FG_SPEED * step;
        if (fgOffset.value >= screenWidth) fgOffset.value -= screenWidth;
        bobPhase.value += BOB_SPEED * step;
      }

      // Avança os seguidores em direção ao seu slot atrás do membro da frente.
      // Retorna um novo array (reanimated reage por referência).
      const marchFollowers = (leaderX: number): number[] => {
        const next = positions.slice();
        next[0] = leaderX;
        for (let i = 1; i < count; i++) {
          const target = next[0] - i * PARTY_SPACING;
          if (next[i] < target) {
            next[i] = Math.min(next[i] + HERO_SPEED, target);
          }
        }
        return next;
      };

      if (combatState.value === "APPROACHING") {
        // Líder caminha para a direita; a fila o acompanha mantendo o espaço.
        partyX.value = marchFollowers(positions[0] + HERO_SPEED);
        enemyX.value -= ENEMY_SPEED;

        const leaderCenterX = partyX.value[0] + HERO_SIZE / 2;
        const distance = Math.abs(enemyX.value - leaderCenterX);
        if (distance <= COLLISION_THRESHOLD) {
          combatState.value = "BATTLING";
          damageTimer.value = 0;
        }
        return;
      }

      if (combatState.value !== "BATTLING") return;

      // Líder parado: seguidores continuam marchando até encostar na fila.
      partyX.value = marchFollowers(positions[0]);

      damageTimer.value += dt;
      // A runa de velocidade encurta o intervalo entre ataques (ataca mais rápido).
      const attackInterval = DAMAGE_INTERVAL_MS / attackSpeedMultiplier.value;
      if (damageTimer.value < attackInterval) return;
      damageTimer.value = 0;

      // Dano ao inimigo = soma dos membros EM POSIÇÃO DE ATAQUE (parados no slot).
      // O Líder ataca sempre enquanto batalha; seguidores só ao alcançar o slot.
      const dmgs = partyDamage.value;
      const pos = partyX.value;
      let baseTotal = dmgs[0] ?? 0;
      for (let i = 1; i < count; i++) {
        const target = pos[0] - i * PARTY_SPACING;
        if (pos[i] >= target - PARTY_IN_POSITION_EPSILON) {
          baseTotal += dmgs[i] ?? 0;
        }
      }

      // Buff de dano das runas aplicado ao total da Party.
      const totalDamage = Math.round(baseTotal * damageMultiplier.value);

      leaderHealth.value = Math.max(0, leaderHealth.value - ENEMY_DAMAGE);
      enemyHealth.value = Math.max(0, enemyHealth.value - totalDamage);

      // Dispara o FCT de cada entidade.
      heroHitAmount.value = ENEMY_DAMAGE;
      enemyHitAmount.value = totalDamage;
      heroHitId.value += 1;
      enemyHitId.value += 1;

      // ---- Morte do inimigo: recompensa + respawn escalado --------------
      if (enemyHealth.value <= 0) {
        const reward = Math.round(
          BASE_GOLD_REWARD * stage.value * goldMultiplier.value,
        );
        if (onEnemyDefeated) runOnJS(onEnemyDefeated)(reward);

        stage.value += 1;
        enemyMaxHealth.value = Math.round(
          enemyMaxHealth.value * ENEMY_HEALTH_GROWTH,
        );
        enemyHealth.value = enemyMaxHealth.value;
        enemyX.value = enemyStartX;

        // Líder recupera a vida e a fila reinicia a aproximação.
        leaderHealth.value = leaderMaxHealth.value;
        partyX.value = buildFormation(count);
        combatState.value = "APPROACHING";
        return;
      }

      // ---- Derrota do Líder: tenta o estágio novamente (loop infinito) ---
      if (leaderHealth.value <= 0) {
        leaderHealth.value = leaderMaxHealth.value;
        enemyHealth.value = enemyMaxHealth.value;
        enemyX.value = enemyStartX;
        partyX.value = buildFormation(count);
        combatState.value = "APPROACHING";
      }
    },
    [enemyStartX, screenWidth, buildFormation, onEnemyDefeated],
  );

  useFrameCallback(frameCallback);

  // ---- Animação do Floating Combat Text -----------------------------------
  const playFct = useCallback(
    (translateY: SharedValue<number>, opacity: SharedValue<number>) => {
      "worklet";
      translateY.value = 0;
      translateY.value = withTiming(-FCT_RISE, { duration: FCT_DURATION_MS });
      opacity.value = withSequence(
        withTiming(1, { duration: 80 }),
        withTiming(0, { duration: FCT_DURATION_MS - 80 }),
      );
    },
    [],
  );

  useAnimatedReaction(
    () => heroHitId.value,
    (id) => {
      if (id > 0) playFct(heroFctY, heroFctOpacity);
    },
  );
  useAnimatedReaction(
    () => enemyHitId.value,
    (id) => {
      if (id > 0) playFct(enemyFctY, enemyFctOpacity);
    },
  );

  // ---- Valores derivados para renderização --------------------------------
  const heroHealthRatio = useDerivedValue(
    () => leaderHealth.value / leaderMaxHealth.value,
  );
  const enemyHealthRatio = useDerivedValue(
    () => enemyHealth.value / enemyMaxHealth.value,
  );

  const leaderX = useDerivedValue(() => partyX.value[0] ?? heroStartX);

  const heroBarX = useDerivedValue(
    () => leaderX.value + HERO_SIZE / 2 - HEALTH_BAR_WIDTH / 2,
  );
  const enemyBarX = useDerivedValue(() => enemyX.value - HEALTH_BAR_WIDTH / 2);

  const heroBarY =
    centerY - HERO_SIZE / 2 - HEALTH_BAR_OFFSET - HEALTH_BAR_HEIGHT;
  const enemyBarY =
    centerY - ENEMY_RADIUS - HEALTH_BAR_OFFSET - HEALTH_BAR_HEIGHT;

  const heroFctX = useDerivedValue(() => leaderX.value + HERO_SIZE / 2 - 12);
  const enemyFctX = useDerivedValue(() => enemyX.value - 12);

  const heroFctText = useDerivedValue(() =>
    heroHitAmount.value > 0 ? `-${heroHitAmount.value}` : "",
  );
  const enemyFctText = useDerivedValue(() =>
    enemyHitAmount.value > 0 ? `-${enemyHitAmount.value}` : "",
  );

  return (
    <View style={styles.container}>
      <Canvas style={[styles.canvas, { height: arenaHeight }]}>
        <Fill color={palette.trueBlack} />

        {/* ---- Cenário em Parallax (esteira infinita, atrás de tudo) ---- */}
        <ParallaxBackground
          width={screenWidth}
          height={arenaHeight}
          bgOffset={bgOffset}
          fgOffset={fgOffset}
        />

        {/* ---- PARTY (Idlemons placeholders em fila) ---- */}
        {party.map((member, index) => (
          <PartyMemberSprite
            key={member.id}
            index={index}
            partyX={partyX}
            baseY={centerY - HERO_SIZE / 2}
            color={member.color}
            spritePath={member.spritePath}
            sheet={member.sheet}
            bobPhase={bobPhase}
            combatState={combatState}
          />
        ))}

        {/* ---- ENEMY (Monstro placeholder) ---- */}
        <Circle cx={enemyX} cy={centerY} r={ENEMY_RADIUS} color={ENEMY_GLOW_COLOR}>
          <BlurMask blur={ENEMY_GLOW_BLUR} style="outer" />
        </Circle>
        <Circle cx={enemyX} cy={centerY} r={ENEMY_RADIUS} color={ENTITY_COLOR} />

        {/* ---- Barras de vida (Líder + inimigo) ---- */}
        <HealthBar
          x={heroBarX}
          y={heroBarY}
          width={HEALTH_BAR_WIDTH}
          height={HEALTH_BAR_HEIGHT}
          ratio={heroHealthRatio}
          fillColor={palette.heroFill}
        />
        <HealthBar
          x={enemyBarX}
          y={enemyBarY}
          width={HEALTH_BAR_WIDTH}
          height={HEALTH_BAR_HEIGHT}
          ratio={enemyHealthRatio}
          fillColor={palette.enemyFill}
        />

        {/* ---- Floating Combat Text ---- */}
        <FloatingDamage
          font={fctFont}
          x={heroFctX}
          baseY={heroBarY - 6}
          translateY={heroFctY}
          opacity={heroFctOpacity}
          text={heroFctText}
          color={palette.damageText}
        />
        <FloatingDamage
          font={fctFont}
          x={enemyFctX}
          baseY={enemyBarY - 6}
          translateY={enemyFctY}
          opacity={enemyFctOpacity}
          text={enemyFctText}
          color={palette.damageText}
        />
      </Canvas>
    </View>
  );
}

interface PartyMemberSpriteProps {
  /** Índice do membro na fila (0 = Líder). */
  index: number;
  /** Array compartilhado de posições X da Party (UI thread). */
  partyX: SharedValue<number[]>;
  /** Topo da entidade em repouso (linha do chão, constante por frame). */
  baseY: number;
  /** Cor neon do Idlemon (fallback + glow). */
  color: string;
  /** Sprite Sheet local (module id do Metro). `undefined` => só placeholder. */
  spritePath?: number;
  /** Config de fatiamento/animação do sheet. `undefined` => quadro único. */
  sheet?: SpriteSheetConfig;
  /** Fase do bobbing de caminhada (aplicado apenas ao Líder). */
  bobPhase: SharedValue<number>;
  /** Estado do combate — o bob só age durante a caminhada (APPROACHING). */
  combatState: SharedValue<CombatState>;
}

/**
 * Renderiza um único Idlemon da fila via `Sprite` (renderSprite). Cada membro é
 * um componente próprio para que adicionar/remover membros monte/desmonte
 * instâncias (sem violar as Rules of Hooks ao iterar um array variável).
 *
 * O Líder (índice 0) ganha um bobbing vertical (Math.sin) enquanto caminha,
 * simulando a cadência de um sprite em pixel art. Tudo na UI thread.
 */
function PartyMemberSprite({
  index,
  partyX,
  baseY,
  color,
  spritePath,
  sheet,
  bobPhase,
  combatState,
}: PartyMemberSpriteProps) {
  const x = useDerivedValue(() => {
    const value = partyX.value[index];
    return value === undefined ? -HERO_SIZE : value;
  });

  const y = useDerivedValue(() => {
    if (index !== 0) return baseY;
    const walking = combatState.value === "APPROACHING";
    const bob = walking ? Math.sin(bobPhase.value) * BOB_AMPLITUDE : 0;
    return baseY + bob;
  });

  return (
    <Sprite
      x={x}
      y={y}
      size={HERO_SIZE}
      color={color}
      glowBlur={HERO_GLOW_BLUR}
      source={spritePath}
      sheet={sheet}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: palette.trueBlack,
  },
  canvas: {
    width: "100%",
  },
});
