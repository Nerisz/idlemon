import React from "react";
import { Text, type SkFont } from "@shopify/react-native-skia";
import { useDerivedValue, type SharedValue } from "react-native-reanimated";

interface FloatingDamageProps {
  font: SkFont;
  /** Posição X (já ajustada para centralizar sobre a entidade). */
  x: SharedValue<number>;
  /** Linha de base inicial do texto. */
  baseY: number;
  /** Deslocamento vertical animado (negativo = sobe). */
  translateY: SharedValue<number>;
  /** Opacidade animada (0 = invisível). */
  opacity: SharedValue<number>;
  /** Conteúdo do número de dano. */
  text: SharedValue<string>;
  color: string;
}

/**
 * Floating Combat Text: número de dano que sobe e some.
 * O estado da animação vive em SharedValues controlados pelo motor;
 * este componente apenas renderiza o Skia Text reativo.
 */
export function FloatingDamage({
  font,
  x,
  baseY,
  translateY,
  opacity,
  text,
  color,
}: FloatingDamageProps) {
  const y = useDerivedValue(() => baseY + translateY.value);

  return (
    <Text x={x} y={y} text={text} font={font} color={color} opacity={opacity} />
  );
}
