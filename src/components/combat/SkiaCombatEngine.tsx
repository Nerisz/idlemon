import React, { useCallback, useEffect, useMemo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import {
  Canvas,
  Rect,
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
  type FrameInfo,
} from "react-native-reanimated";

import { palette } from "../../theme/colors";
import { HealthBar } from "./HealthBar";
import { FloatingDamage } from "./FloatingDamage";
import {
  ARENA_HEIGHT_RATIO,
  HERO_SIZE,
  HERO_SPEED,
  HERO_GLOW_COLOR,
  HERO_GLOW_BLUR,
  HERO_MAX_HEALTH,
  HERO_DAMAGE,
  ENEMY_RADIUS,
  ENEMY_SPEED,
  ENEMY_GLOW_COLOR,
  ENEMY_GLOW_BLUR,
  ENEMY_MAX_HEALTH,
  ENEMY_DAMAGE,
  ENTITY_COLOR,
  COLLISION_THRESHOLD,
  DAMAGE_INTERVAL_MS,
  BASE_GOLD_REWARD,
  ENEMY_HEALTH_GROWTH,
  HEALTH_BAR_WIDTH,
  HEALTH_BAR_HEIGHT,
  HEALTH_BAR_OFFSET,
  FCT_FONT_SIZE,
  FCT_RISE,
  FCT_DURATION_MS,
} from "./constants";

/** Fases do encontro. Pronto para expansão (status, fuga, recompensa). */
export type CombatState = "APPROACHING" | "BATTLING" | "VICTORY" | "DEFEAT";

interface SkiaCombatEngineProps {
  /** Dano base do Hero por tick (fonte de verdade no `useGameStore`). */
  heroDamage?: number;
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
 * Reanimated worklets. A economia vive no `useGameStore` (JS thread): o dano do
 * Hero entra via prop espelhada em SharedValue, e as vitórias saem via
 * `onEnemyDefeated` (runOnJS).
 */
export default function SkiaCombatEngine({
  heroDamage = HERO_DAMAGE,
  onEnemyDefeated,
}: SkiaCombatEngineProps) {
  const { width: screenWidth } = useWindowDimensions();
  const arenaHeight = Math.round(screenWidth * ARENA_HEIGHT_RATIO);
  const centerY = arenaHeight / 2;

  // Hero entra à esquerda; inimigo (re)aparece na extremidade direita da tela.
  const heroStartX = HERO_SIZE / 2;
  const enemyStartX = screenWidth + ENEMY_RADIUS;

  // Fonte do Floating Combat Text via fonte do sistema (sem bundle de assets).
  const fctFont = useMemo(
    () => matchFont({ fontSize: FCT_FONT_SIZE, fontWeight: "700" }),
    [],
  );

  // ---- Estado simulado (SharedValues → UI thread, sem bridge) -------------
  const combatState = useSharedValue<CombatState>("APPROACHING");

  const heroX = useSharedValue(heroStartX);
  const enemyX = useSharedValue(enemyStartX);

  const heroHealth = useSharedValue(HERO_MAX_HEALTH);
  const enemyHealth = useSharedValue(ENEMY_MAX_HEALTH);
  /** Vida máxima atual do inimigo — cresce a cada estágio. */
  const enemyMaxHealth = useSharedValue(ENEMY_MAX_HEALTH);

  // Estágio espelhado na UI thread: dirige o multiplicador de ouro e o scaling.
  const stage = useSharedValue(1);
  // Dano do Hero espelhado da store (sincronizado por efeito abaixo).
  const heroDamageValue = useSharedValue(heroDamage);

  // Acumulador de tempo para o dano periódico.
  const damageTimer = useSharedValue(0);

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

  // Espelha o dano do Hero (store → UI thread) sem recriar o loop.
  useEffect(() => {
    heroDamageValue.value = heroDamage;
  }, [heroDamage, heroDamageValue]);

  // ---- Game loop ----------------------------------------------------------
  const frameCallback = useCallback(
    (frame: FrameInfo) => {
      "worklet";
      const dt = frame.timeSincePreviousFrame ?? 16;

      if (combatState.value === "APPROACHING") {
        heroX.value += HERO_SPEED;
        enemyX.value -= ENEMY_SPEED;

        const heroCenterX = heroX.value + HERO_SIZE / 2;
        const distance = Math.abs(enemyX.value - heroCenterX);

        if (distance <= COLLISION_THRESHOLD) {
          combatState.value = "BATTLING";
          damageTimer.value = 0;
        }
        return;
      }

      if (combatState.value !== "BATTLING") return;

      // Bump: velocidades zeradas (entidades paradas), aplicando dano por tick.
      damageTimer.value += dt;
      if (damageTimer.value < DAMAGE_INTERVAL_MS) return;
      damageTimer.value = 0;

      const heroHit = heroDamageValue.value;
      heroHealth.value = Math.max(0, heroHealth.value - ENEMY_DAMAGE);
      enemyHealth.value = Math.max(0, enemyHealth.value - heroHit);

      // Dispara o FCT de cada entidade.
      heroHitAmount.value = ENEMY_DAMAGE;
      enemyHitAmount.value = heroHit;
      heroHitId.value += 1;
      enemyHitId.value += 1;

      // ---- Morte do inimigo: recompensa + respawn escalado --------------
      if (enemyHealth.value <= 0) {
        const reward = BASE_GOLD_REWARD * stage.value;
        if (onEnemyDefeated) runOnJS(onEnemyDefeated)(reward);

        stage.value += 1;
        enemyMaxHealth.value = Math.round(
          enemyMaxHealth.value * ENEMY_HEALTH_GROWTH,
        );
        enemyHealth.value = enemyMaxHealth.value;
        enemyX.value = enemyStartX;

        // Hero recupera a vida e volta a caminhar para a direita.
        heroHealth.value = HERO_MAX_HEALTH;
        combatState.value = "APPROACHING";
        return;
      }

      // ---- Derrota do Hero: tenta o estágio novamente (loop infinito) ---
      if (heroHealth.value <= 0) {
        heroHealth.value = HERO_MAX_HEALTH;
        enemyHealth.value = enemyMaxHealth.value;
        enemyX.value = enemyStartX;
        combatState.value = "APPROACHING";
      }
    },
    [enemyStartX, onEnemyDefeated],
  );

  useFrameCallback(frameCallback);

  // ---- Animação do Floating Combat Text -----------------------------------
  const playFct = useCallback(
    (translateY: typeof heroFctY, opacity: typeof heroFctOpacity) => {
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
    () => heroHealth.value / HERO_MAX_HEALTH,
  );
  const enemyHealthRatio = useDerivedValue(
    () => enemyHealth.value / enemyMaxHealth.value,
  );

  const heroBarX = useDerivedValue(
    () => heroX.value + HERO_SIZE / 2 - HEALTH_BAR_WIDTH / 2,
  );
  const enemyBarX = useDerivedValue(() => enemyX.value - HEALTH_BAR_WIDTH / 2);

  const heroBarY =
    centerY - HERO_SIZE / 2 - HEALTH_BAR_OFFSET - HEALTH_BAR_HEIGHT;
  const enemyBarY =
    centerY - ENEMY_RADIUS - HEALTH_BAR_OFFSET - HEALTH_BAR_HEIGHT;

  const heroFctX = useDerivedValue(() => heroX.value + HERO_SIZE / 2 - 12);
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

        {/* ---- HERO (Idlemon placeholder) ---- */}
        <Rect
          x={heroX}
          y={centerY - HERO_SIZE / 2}
          width={HERO_SIZE}
          height={HERO_SIZE}
          color={HERO_GLOW_COLOR}
        >
          <BlurMask blur={HERO_GLOW_BLUR} style="outer" />
        </Rect>
        <Rect
          x={heroX}
          y={centerY - HERO_SIZE / 2}
          width={HERO_SIZE}
          height={HERO_SIZE}
          color={ENTITY_COLOR}
        />

        {/* ---- ENEMY (Monstro placeholder) ---- */}
        <Circle cx={enemyX} cy={centerY} r={ENEMY_RADIUS} color={ENEMY_GLOW_COLOR}>
          <BlurMask blur={ENEMY_GLOW_BLUR} style="outer" />
        </Circle>
        <Circle cx={enemyX} cy={centerY} r={ENEMY_RADIUS} color={ENTITY_COLOR} />

        {/* ---- Barras de vida ---- */}
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

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: palette.trueBlack,
  },
  canvas: {
    width: "100%",
  },
});
