import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { glow, palette, radius, spacing } from "../../theme/colors";

interface NeonButtonProps {
  label: string;
  onPress?: () => void;
  /** Texto secundário opcional (ex: custo da ação). */
  caption?: string;
  accent?: "cyan" | "purple";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Botão base do design system neon: cantos arredondados, fundo escuro e
 * brilho (shadow) sutil na cor de acento. Pronto para validar a interação.
 */
export function NeonButton({
  label,
  onPress,
  caption,
  accent = "cyan",
  disabled = false,
  style,
}: NeonButtonProps) {
  const accentColor = accent === "cyan" ? palette.neonCyan : palette.neonPurple;
  const accentGlow = accent === "cyan" ? glow.cyan : glow.purple;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { borderColor: accentColor },
        accentGlow,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.label, { color: accentColor }]} numberOfLines={1}>
        {label}
      </Text>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: palette.surfaceElevated,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  caption: {
    fontSize: 12,
    fontWeight: "500",
    color: palette.textSecondary,
  },
});
