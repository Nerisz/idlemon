import React, { useMemo } from "react";
import { Group, Rect, Circle } from "@shopify/react-native-skia";
import { useDerivedValue, type SharedValue } from "react-native-reanimated";

import { palette } from "../../theme/colors";
import {
  GROUND_HEIGHT,
  SKYLINE_COUNT,
  STAR_COUNT,
  GROUND_DASH_TARGET,
} from "./constants";

interface ParallaxBackgroundProps {
  /** Largura da tela = período do tile (garante loop perfeito). */
  width: number;
  /** Altura da arena (Canvas). */
  height: number;
  /** Deslocamento X do céu/fundo distante (move devagar). */
  bgOffset: SharedValue<number>;
  /** Deslocamento X do chão/trilha (move rápido). */
  fgOffset: SharedValue<number>;
}

/**
 * Cenário em Parallax com efeito esteira (loop infinito).
 *
 * Estratégia de performance: os elementos do cenário são nós Skia ESTÁTICOS
 * (posições memoizadas). Só os dois `<Group transform>` de cada camada animam,
 * lendo os SharedValues na UI thread — zero re-render do React.
 *
 * Tiling perfeito: cada camada desenha DUAS cópias idênticas do tile (em x=0 e
 * x=width). Como o período é exatamente `width` e o motor reseta o offset ao
 * cruzar `width`, a cópia da direita assume o lugar da esquerda sem emenda.
 */
export function ParallaxBackground({
  width,
  height,
  bgOffset,
  fgOffset,
}: ParallaxBackgroundProps) {
  const groundY = height - GROUND_HEIGHT;

  // ---- Cenário distante (céu): silhuetas + estrelas neon -------------------
  const skyline = useMemo(() => {
    const slot = width / SKYLINE_COUNT;
    return Array.from({ length: SKYLINE_COUNT }, (_, i) => {
      // Alturas determinísticas (sem random p/ evitar flicker no remount).
      const h = 34 + ((i * 37) % 52);
      return { x: i * slot + slot * 0.12, w: slot * 0.52, h };
    });
  }, [width]);

  const stars = useMemo(() => {
    const ceiling = groundY * 0.6;
    return Array.from({ length: STAR_COUNT }, (_, i) => ({
      x: (((i * 97) % 100) / 100) * width,
      y: (((i * 53) % 100) / 100) * ceiling + 6,
      r: 1 + (i % 2),
    }));
  }, [width, groundY]);

  // ---- Trilha (chão): traços neon equidistantes ---------------------------
  const dashes = useMemo(() => {
    const count = Math.max(1, Math.round(width / GROUND_DASH_TARGET));
    const step = width / count;
    return Array.from({ length: count }, (_, i) => ({
      x: i * step + step * 0.2,
      w: step * 0.55,
    }));
  }, [width]);

  const bgTransform = useDerivedValue(() => [
    { translateX: -bgOffset.value },
  ]);
  const fgTransform = useDerivedValue(() => [
    { translateX: -fgOffset.value },
  ]);

  const dashY = groundY + GROUND_HEIGHT / 2 - 1;

  return (
    <>
      {/* ===== Camada distante (céu) — move devagar ===== */}
      <Group transform={bgTransform}>
        {[0, width].map((ox) => (
          <Group key={`sky-${ox}`} transform={[{ translateX: ox }]}>
            {stars.map((s, i) => (
              <Circle
                key={`star-${i}`}
                cx={s.x}
                cy={s.y}
                r={s.r}
                color={palette.neonPurple}
                opacity={0.35}
              />
            ))}
            {skyline.map((b, i) => (
              <Rect
                key={`bld-${i}`}
                x={b.x}
                y={groundY - b.h}
                width={b.w}
                height={b.h}
                color={palette.surfaceElevated}
              />
            ))}
          </Group>
        ))}
      </Group>

      {/* ===== Camada próxima (chão/trilha) — move rápido ===== */}
      <Group transform={fgTransform}>
        {[0, width].map((ox) => (
          <Group key={`gnd-${ox}`} transform={[{ translateX: ox }]}>
            <Rect
              x={0}
              y={groundY}
              width={width}
              height={GROUND_HEIGHT}
              color={palette.surface}
            />
            {/* Borda superior neon (acento ciano sutil). */}
            <Rect
              x={0}
              y={groundY}
              width={width}
              height={1.5}
              color={palette.neonCyan}
              opacity={0.4}
            />
            {dashes.map((d, i) => (
              <Rect
                key={`dash-${i}`}
                x={d.x}
                y={dashY}
                width={d.w}
                height={2}
                color={palette.neonCyan}
                opacity={0.45}
              />
            ))}
          </Group>
        ))}
      </Group>
    </>
  );
}
