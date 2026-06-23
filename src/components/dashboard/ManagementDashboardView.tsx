import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { palette, spacing } from "../../theme/colors";
import { useGameStore } from "../../store/useGameStore";
import { DAMAGE_UPGRADE_AMOUNT } from "../combat/constants";
import { WalletHeader } from "./WalletHeader";
import { NeonButton } from "./NeonButton";
import {
  DashboardTabs,
  type DashboardTab,
} from "./DashboardTabs";

/**
 * Painel de gerenciamento (React Native puro).
 *
 * Camada de UI fora do Canvas Skia, totalmente reativa ao `useGameStore`:
 * exibe a carteira no cabeçalho e permite evoluir os atributos do Hero, que
 * alimentam de volta o motor de combate.
 */
export function ManagementDashboardView() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("ATRIBUTOS");
  const gold = useGameStore((state) => state.gold);
  const stage = useGameStore((state) => state.stage);

  return (
    <View style={styles.container}>
      <WalletHeader gold={gold} stage={stage} />

      <View style={styles.content}>
        <TabContent tab={activeTab} />
      </View>

      <DashboardTabs active={activeTab} onChange={setActiveTab} />
    </View>
  );
}

function TabContent({ tab }: { tab: DashboardTab }) {
  if (tab === "ATRIBUTOS") {
    return <AtributosTab />;
  }

  if (tab === "PARTY") {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>Sua Party</Text>
        <Text style={styles.sectionHint}>
          Recrute aliados Idlemon para lutar ao seu lado. (Em breve)
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Loja</Text>
      <Text style={styles.sectionHint}>
        Gaste seu ouro em melhorias e equipamentos. (Em breve)
      </Text>
    </View>
  );
}

/** Aba de atributos: evolui o dano do Hero consumindo ouro da store. */
function AtributosTab() {
  const gold = useGameStore((state) => state.gold);
  const heroDamage = useGameStore((state) => state.heroDamage);
  const damageUpgradeCost = useGameStore((state) => state.damageUpgradeCost);
  const upgradeDamage = useGameStore((state) => state.upgradeDamage);

  const canAfford = gold >= damageUpgradeCost;

  return (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Atributos do Herói</Text>
      <Text style={styles.sectionHint}>
        Evolua o Idlemon para vencer encontros mais difíceis.
      </Text>

      <View style={styles.statRow}>
        <Text style={styles.statLabel}>Dano de Ataque</Text>
        <Text style={styles.statValue}>{heroDamage}</Text>
      </View>

      <NeonButton
        label={`Upgrade Dano (+${DAMAGE_UPGRADE_AMOUNT})`}
        caption={`Custo: ${damageUpgradeCost.toLocaleString("pt-BR")} ouro`}
        accent="cyan"
        disabled={!canAfford}
        onPress={upgradeDamage}
        style={styles.levelUpButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  tabContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  sectionTitle: {
    color: palette.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  sectionHint: {
    color: palette.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: 240,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  statLabel: {
    color: palette.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  statValue: {
    color: palette.neonCyan,
    fontSize: 18,
    fontWeight: "800",
  },
  levelUpButton: {
    marginTop: spacing.md,
    minWidth: 240,
  },
});
