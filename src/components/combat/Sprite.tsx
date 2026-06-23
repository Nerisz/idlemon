import React from "react";
import {
  Rect,
  BlurMask,
  Atlas,
  rect,
  Skia,
  useImage,
  useClock,
  type SkImage,
} from "@shopify/react-native-skia";
import { useDerivedValue, type SharedValue } from "react-native-reanimated";
import type { SpriteSheetConfig } from "../../data/idlemonsData";

/**
 * Recorte (frame) de um Sprite Sheet 2D em pixels de origem.
 * Unidade que o `<Atlas>` fatia da textura para desenhar um quadro.
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
  /** Cor neon do fallback (glow + preenchimento) enquanto a textura carrega. */
  color: string;
  /** Raio do blur do glow externo (mantém a estética neon nos sprites). */
  glowBlur: number;
  /**
   * Sprite Sheet local (module id do Metro via `require`). Enquanto a imagem
   * está carregando (`null`) — ou ausente — renderiza o quadrado neon (MVP).
   */
  source?: number;
  /**
   * Config de fatiamento/animação do sheet. `undefined` => a imagem inteira é
   * tratada como um único quadro estático (caso do placeholder de uma frame).
   */
  sheet?: SpriteSheetConfig;
}

/**
 * SpriteAnimator: renderizador de entidade orientado a pixel art.
 *
 * Consome a textura local com `useImage(source)`. ENQUANTO ela carrega (`null`),
 * desenha o quadrado neon com glow (fallback do MVP) — sem tela preta e sem
 * custo de bridge. Quando a imagem chega, delega para o caminho de Sprite Sheet
 * fatiado via `<Atlas>` (animação 100% na UI thread).
 *
 * `useImage` é chamado incondicionalmente (Rules of Hooks). A troca
 * imagem ⇄ fallback é só renderização condicional.
 */
export function Sprite({
  x,
  y,
  size,
  color,
  glowBlur,
  source,
  sheet,
}: SpriteProps) {
  const image = useImage(source ?? null);

  if (image) {
    return (
      <SpriteSheetAnimator
        image={image}
        sheet={sheet}
        x={x}
        y={y}
        size={size}
        glowBlur={glowBlur}
      />
    );
  }

  // Fallback (imagem carregando/ausente): quadrado neon com glow externo.
  return (
    <>
      <Rect x={x} y={y} width={size} height={size} color={color}>
        <BlurMask blur={glowBlur} style="outer" />
      </Rect>
      <Rect x={x} y={y} width={size} height={size} color={color} />
    </>
  );
}

interface SpriteSheetAnimatorProps {
  image: SkImage;
  sheet?: SpriteSheetConfig;
  x: SharedValue<number>;
  y: SharedValue<number>;
  size: number;
  glowBlur: number;
}

/**
 * Caminho de Sprite Sheet via `<Atlas>`. Isolado para que os hooks de animação
 * só montem quando há `image` (respeitando as Rules of Hooks).
 *
 * - Sem `sheet`: a textura inteira é o único quadro (placeholder de 1 frame).
 * - Com `sheet`: percorre os quadros horizontalmente pela `useClock` do Skia,
 *   na cadência de `fps`, tudo na UI thread (sem re-render do React).
 *
 * O glow é preservado desenhando o Atlas duas vezes: uma borrada (BlurMask
 * "outer" = halo neon) e uma nítida por cima.
 */
function SpriteSheetAnimator({
  image,
  sheet,
  x,
  y,
  size,
  glowBlur,
}: SpriteSheetAnimatorProps) {
  const clock = useClock();

  // Geometria do quadro resolvida no JS (numérica) e capturada nos worklets.
  const frameWidth = sheet?.frameWidth ?? image.width();
  const frameHeight = sheet?.frameHeight ?? image.height();
  const frameCount = sheet?.frameCount ?? 1;
  const fps = sheet?.fps ?? 1;

  // Recorte de origem animado. Só lê o clock quando há mais de um quadro,
  // mantendo o caso estático (placeholder) sem recomputo por frame.
  const sprites = useDerivedValue(() => {
    if (frameCount <= 1) {
      return [rect(0, 0, frameWidth, frameHeight)];
    }
    const index = Math.floor(clock.value / (1000 / fps)) % frameCount;
    return [rect(index * frameWidth, 0, frameWidth, frameHeight)];
  });

  // RSXform = escala (destino/origem) + translação pela posição compartilhada.
  const transforms = useDerivedValue(() => {
    const scale = size / frameWidth;
    return [Skia.RSXform(scale, 0, x.value, y.value)];
  });

  return (
    <>
      <Atlas image={image} sprites={sprites} transforms={transforms}>
        <BlurMask blur={glowBlur} style="outer" />
      </Atlas>
      <Atlas image={image} sprites={sprites} transforms={transforms} />
    </>
  );
}
