import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { palette, spacing } from "../../theme/colors";

export type DashboardTab = "ATRIBUTOS" | "PARTY" | "LOJA";

export const DASHBOARD_TABS: { id: DashboardTab; label: string }[] = [
  { id: "ATRIBUTOS", label: "Atributos" },
  { id: "PARTY", label: "Party" },
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
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
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
