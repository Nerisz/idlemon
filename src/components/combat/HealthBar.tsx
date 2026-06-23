import React from "react";
import { RoundedRect } from "@shopify/react-native-skia";
import { useDerivedValue, type SharedValue } from "react-native-reanimated";
import { palette } from "../../theme/colors";

interface HealthBarProps {
  /** Borda esquerda da barra (derivada da posição da entidade). */
  x: SharedValue<number>;
  /** Topo da barra (estático — a entidade só se move no eixo X). */
  y: number;
  width: number;
  height: number;
  /** Razão de vida (0..1). */
  ratio: SharedValue<number>;
  fillColor: string;
}

/**
 * Barra de vida minimalista: dois retângulos arredondados sobrepostos
 * (trilho escuro + preenchimento neon). Puramente visual, dirigida por
 * SharedValues — não contém regra de gameplay.
 */
export function HealthBar({ x, y, width, height, ratio, fillColor }: HealthBarProps) {
  const fillWidth = useDerivedValue(
    () => Math.max(0, Math.min(1, ratio.value)) * width,
  );
  const r = height / 2;

  return (
    <>
      <RoundedRect
        x={x}
        y={y}
        width={width}
        height={height}
        r={r}
        color={palette.healthTrack}
      />
      <RoundedRect
        x={x}
        y={y}
        width={fillWidth}
        height={height}
        r={r}
        color={fillColor}
      />
    </>
  );
}
