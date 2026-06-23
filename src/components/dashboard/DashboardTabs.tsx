import React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import { palette, spacing } from "../../theme/colors";

export type DashboardTab = "ATRIBUTOS" | "PARTY" | "RUNAS" | "LOJA";

/** Sprite 32x32 (Pixel Art) — renderizado em 2x para nitidez estourada. */
const ATRIBUTOS_ICON = require("../../../assets/ui/tabs/spritetest.png") as ImageSourcePropType;

export const DASHBOARD_TABS: {
  id: DashboardTab;
  label: string;
  icon?: ImageSourcePropType;
}[] = [
  { id: "ATRIBUTOS", label: "Atributos", icon: ATRIBUTOS_ICON },
  { id: "PARTY", label: "Party" },
  { id: "RUNAS", label: "Runas" },
  { id: "LOJA", label: "Loja" },
];

interface DashboardTabsProps {
  active: DashboardTab;
  onChange: (tab: DashboardTab) => void;
}

/** Barra de abas do rodapé. Apenas texto por enquanto, com indicador neon. */
export function DashboardTabs({ active, onChange }: DashboardTabsProps) {
  return (
    <View style={styles.container}>
      {DASHBOARD_TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(tab.id)}
            style={styles.tab}
          >
            {tab.icon ? (
              <Image
                source={tab.icon}
                resizeMode="contain"
                fadeDuration={0}
                style={[styles.icon, !isActive && styles.iconInactive]}
                accessibilityLabel={tab.label}
              />
            ) : (
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {tab.label}
              </Text>
            )}
            <View style={[styles.indicator, isActive && styles.indicatorActive]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: palette.border,
    backgroundColor: palette.surface,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  icon: {
    // Render 2x do original (32 -> 64) para pixel art nítido e intencional.
    width: 64,
    height: 64,
    // Web: evita interpolação/blur ao escalar o sprite.
    imageRendering: "pixelated" as never,
  },
  iconInactive: {
    opacity: 0.45,
  },
  label: {
    color: palette.textMuted,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  labelActive: {
    color: palette.textPrimary,
  },
  indicator: {
    height: 2,
    width: 24,
    borderRadius: 1,
    backgroundColor: "transparent",
  },
  indicatorActive: {
    backgroundColor: palette.neonPurple,
  },
});
