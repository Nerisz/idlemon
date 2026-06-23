import React, { useMemo } from "react";
import {
  Rect,
  BlurMask,
  Atlas,
  rect,
  Skia,
  type SkImage,
} from "@shopify/react-native-skia";
import { useDerivedValue, type SharedValue } from "react-native-reanimated";

/**
 * Recorte (frame) de um Sprite Sheet 2D em pixels de origem.
 * É a unidade que o `<Atlas>` fatia da textura para desenhar um quadro.
 */
export interface SpriteFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SpriteProps {
  /** Canto superior-esquerdo X (animado na UI thread). */
  x: SharedValue<number>;
  /** Canto superior-esquerdo Y (animado — inclui o bobbing do Líder). */
  y: SharedValue<number>;
  /** Lado do sprite em pixels de destino na arena. */
  size: number;
  /** Cor neon do placeholder atual (glow + preenchimento). */
  color: string;
  /** Raio do blur do glow externo. */
  glowBlur: number;
  /**
   * Textura do Sprite Sheet. ENQUANTO `null/undefined`, renderiza o quadrado
   * neon (MVP). Quando injetado, ativa o caminho de pixel art fatiado.
   */
  image?: SkImage | null;
  /** Quadro atual dentro do sheet (origem do recorte). */
  frame?: SpriteFrame;
}

/**
 * Renderizador abstrato de entidade (`renderSprite`).
 *
 * Hoje devolve o quadrado neon com glow (placeholder do MVP). A assinatura já
 * está preparada para receber um `SkImage` (Sprite Sheet) e fatiá-lo via
 * `<Atlas>` do Skia — bastará passar `image` + `frame` para trocar o
 * placeholder pela animação 2D sem tocar no motor de combate.
 *
 * Não introduz re-render: posição/quadro fluem por SharedValues (UI thread).
 */
export function Sprite({
  x,
  y,
  size,
  color,
  glowBlur,
  image,
  frame,
}: SpriteProps) {
  // Caminho futuro: pixel art fatiada do Sprite Sheet.
  if (image && frame) {
    return <SpriteSheet image={image} frame={frame} x={x} y={y} size={size} />;
  }

  // Caminho atual (MVP): quadrado neon com glow externo.
  return (
    <>
      <Rect x={x} y={y} width={size} height={size} color={color}>
        <BlurMask blur={glowBlur} style="outer" />
      </Rect>
      <Rect x={x} y={y} width={size} height={size} color={color} />
    </>
  );
}

interface SpriteSheetProps {
  image: SkImage;
  frame: SpriteFrame;
  x: SharedValue<number>;
  y: SharedValue<number>;
  size: number;
}

/**
 * Caminho de Sprite Sheet via `<Atlas>`: desenha um único recorte da textura
 * escalado para `size`, posicionado pelos SharedValues. Mantido isolado para
 * respeitar as Rules of Hooks (hooks só rodam quando há `image`).
 */
function SpriteSheet({ image, frame, x, y, size }: SpriteSheetProps) {
  // Sprite = recorte de origem (estável enquanto o quadro não muda).
  const sprites = useMemo(
    () => [rect(frame.x, frame.y, frame.width, frame.height)],
    [frame.x, frame.y, frame.width, frame.height],
  );

  // RSXform = escala + translação. Anima na UI thread (sem bridge).
  const transforms = useDerivedValue(() => {
    const scale = size / frame.width;
    return [Skia.RSXform(scale, 0, x.value, y.value)];
  });

  return <Atlas image={image} sprites={sprites} transforms={transforms} />;
}
